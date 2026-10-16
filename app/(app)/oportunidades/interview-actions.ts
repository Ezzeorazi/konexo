"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { generateAiChat, generateAiText, type ChatMessage } from "@/lib/ai";
import { clampText } from "@/lib/prompt-safety";
import { getJobProfile } from "@/lib/job-profile";
import { parseStoredFit, profileIsUsable } from "@/lib/fit";
import {
  buildMockSystemPrompt,
  buildPrepPrompt,
  isInterviewStage,
  MOCK_KICKOFF,
  type InterviewContext,
  type InterviewStage,
} from "@/lib/interview";

/** Arma el contexto de entrevista de UNA búsqueda de empleo del usuario. */
async function loadInterviewContext(
  userId: string,
  opportunityId: string
): Promise<
  | { ok: true; ctx: InterviewContext; prep: string | null }
  | { ok: false; error: string }
> {
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId, track: "jobs" },
    select: {
      title: true,
      jobDescription: true,
      fitReport: true,
      interviewPrep: true,
      company: { select: { name: true } },
      cvVersion: { select: { content: true } },
      touchpoints: {
        where: { note: { not: null } },
        orderBy: { occurredAt: "desc" },
        take: 8,
        select: { type: true, note: true, occurredAt: true },
      },
    },
  });
  if (!opp) return { ok: false, error: "No encontré la búsqueda." };
  if (!opp.jobDescription?.trim()) {
    return { ok: false, error: "Pegá la descripción del aviso para preparar la entrevista." };
  }
  const profile = await getJobProfile();
  return {
    ok: true,
    prep: opp.interviewPrep,
    ctx: {
      title: opp.title,
      company: opp.company?.name ?? null,
      jobDescription: opp.jobDescription,
      cv: opp.cvVersion?.content?.trim() || null,
      profile: profileIsUsable(profile) ? profile : null,
      gaps: parseStoredFit(opp.fitReport)?.gaps ?? [],
      history: opp.touchpoints.map(
        (t) => `- ${t.occurredAt.toISOString().slice(0, 10)} [${t.type}]: ${t.note}`
      ),
    },
  };
}

export type PrepResult =
  | { ok: true; text: string; stage: InterviewStage; at: string }
  | { ok: false; error: string };

/** Genera (y guarda) el pack de preparación para un tipo de entrevista. */
export async function generateInterviewPrep(
  opportunityId: string,
  stage: string
): Promise<PrepResult> {
  if (typeof opportunityId !== "string" || !isInterviewStage(stage)) {
    return { ok: false, error: "Datos inválidos." };
  }
  const userId = await currentUserId();
  const loaded = await loadInterviewContext(userId, opportunityId);
  if (!loaded.ok) return loaded;

  const res = await generateAiText({
    surface: "interview",
    ...buildPrepPrompt(loaded.ctx, stage),
  });
  if (!res.ok) return res;

  const at = new Date();
  await prisma.opportunity.updateMany({
    where: { id: opportunityId, userId },
    data: { interviewPrep: res.text, interviewPrepStage: stage, interviewPrepAt: at },
  });
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true, text: res.text, stage, at: at.toISOString() };
}

const MAX_CHARS_PER_ANSWER = 4000;
const MAX_TURNS = 30;

/**
 * Un turno del simulacro. El system prompt (entrevistador) se arma SIEMPRE en
 * el server desde los datos de la búsqueda: el cliente solo manda la charla.
 * Con `messages` vacío arranca el simulacro (primera pregunta).
 */
export async function sendMockInterviewMessage(
  opportunityId: string,
  stage: string,
  messages: ChatMessage[]
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (typeof opportunityId !== "string" || !isInterviewStage(stage) || !Array.isArray(messages)) {
    return { ok: false, error: "Datos inválidos." };
  }
  const userId = await currentUserId();
  const loaded = await loadInterviewContext(userId, opportunityId);
  if (!loaded.ok) return loaded;

  // Solo roles válidos y texto acotado: la charla viene del cliente.
  const history: ChatMessage[] = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: clampText(m.content, MAX_CHARS_PER_ANSWER) }));

  return generateAiChat({
    surface: "interview",
    system: buildMockSystemPrompt(loaded.ctx, stage, loaded.prep),
    // El arranque oculto va siempre primero: los proveedores esperan que la
    // conversación empiece con un mensaje del usuario.
    messages: [{ role: "user", content: MOCK_KICKOFF }, ...history],
  });
}
