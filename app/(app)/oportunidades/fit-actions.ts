"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { generateAiText } from "@/lib/ai";
import { extractJson } from "@/lib/extract-json";
import { buildFitPrompt, buildFitReport, profileIsUsable, type FitReport } from "@/lib/fit";
import { getJobProfile } from "@/lib/job-profile";

export type FitResult =
  | { ok: true; report: FitReport }
  | { ok: false; error: string };

/**
 * "Evaluar fit" (modo empleo): filtros + 4 dimensiones ponderadas sobre el
 * aviso de la oportunidad vs el perfil de candidato. Una sola llamada al LLM;
 * el puntaje y el veredicto se calculan acá (lib/fit.ts) y se guardan en la
 * oportunidad para que el Calificador y las galletas los usen.
 */
export async function evaluateFit(opportunityId: string): Promise<FitResult> {
  if (typeof opportunityId !== "string") {
    return { ok: false, error: "Datos inválidos." };
  }
  const userId = await currentUserId();
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId, track: "jobs" },
    select: {
      id: true,
      title: true,
      location: true,
      jobDescription: true,
      company: { select: { name: true } },
    },
  });
  if (!opp) return { ok: false, error: "No encontré la oportunidad." };
  if (!opp.jobDescription?.trim()) {
    return {
      ok: false,
      error: "Pegá la descripción del aviso para poder evaluar el fit.",
    };
  }
  const profile = await getJobProfile();
  if (!profileIsUsable(profile)) {
    return {
      ok: false,
      error:
        "Completá tu perfil de candidato en Configuración (al menos skills fuertes y experiencia).",
    };
  }

  const { system, prompt } = buildFitPrompt({
    title: opp.title,
    company: opp.company?.name ?? null,
    location: opp.location,
    jobDescription: opp.jobDescription,
    profile,
  });
  const res = await generateAiText({ surface: "fit", system, prompt });
  if (!res.ok) return res;

  const raw = extractJson<unknown>(res.text);
  if (!raw) {
    return {
      ok: false,
      error: "La IA no devolvió una evaluación legible. Probá de nuevo.",
    };
  }
  const now = new Date();
  const report = buildFitReport(raw, now);

  await prisma.opportunity.updateMany({
    where: { id: opp.id, userId },
    data: {
      fitScore: report.overall,
      fitVerdict: report.verdict,
      fitReport: JSON.stringify(report),
      fitEvaluatedAt: now,
    },
  });
  revalidatePath(`/oportunidades/${opp.id}`);
  revalidatePath("/dashboard");
  return { ok: true, report };
}
