"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { generateAiText } from "@/lib/ai";
import { getJobProfile } from "@/lib/job-profile";
import { profileIsUsable } from "@/lib/fit";
import {
  buildDrafterPrompt,
  buildReviewerPrompt,
  buildReviserPrompt,
  parseTailorSections,
  type TailorInput,
  type TailorSections,
} from "@/lib/cv-prompts";

export type TailorResult =
  | {
      ok: true;
      sections: TailorSections | null;
      /** Respuesta cruda del corrector, por si no vino con las secciones. */
      text: string;
      /** Lo que marcó el revisor (para mostrar "qué se corrigió"). */
      review: string;
    }
  | { ok: false; error: string };

/**
 * Adaptar CV a un aviso (Fase 3). Adaptado del /apply de ai-job-search (MIT):
 * REDACTOR (CV adaptado + carta + cobertura de requisitos) → REVISOR (actúa de
 * hiring manager: inventos, requisitos sin cubrir, keywords, estilo) →
 * CORRECTOR (aplica la revisión). Son 3 llamadas a la IA, en serie porque cada
 * una depende de la anterior.
 */
export async function tailorCv(opportunityId: string): Promise<TailorResult> {
  if (typeof opportunityId !== "string") {
    return { ok: false, error: "Datos inválidos." };
  }
  const userId = await currentUserId();
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    select: {
      title: true,
      jobDescription: true,
      company: { select: { name: true } },
      cvVersion: { select: { content: true } },
    },
  });
  if (!opp) return { ok: false, error: "No encontré la oportunidad." };
  if (!opp.jobDescription?.trim()) {
    return {
      ok: false,
      error: "Pegá la descripción del aviso para poder adaptar tu CV.",
    };
  }
  if (!opp.cvVersion?.content?.trim()) {
    return {
      ok: false,
      error:
        "Asigná una versión de CV con contenido (subí tu PDF o pegá el texto en Configuración).",
    };
  }

  const profile = await getJobProfile();
  const input: TailorInput = {
    title: opp.title,
    company: opp.company?.name ?? null,
    jobDescription: opp.jobDescription,
    cv: opp.cvVersion.content,
    profile: profileIsUsable(profile) ? profile : null,
  };

  const draft = await generateAiText({ surface: "cv", ...buildDrafterPrompt(input) });
  if (!draft.ok) return draft;

  const review = await generateAiText({
    surface: "cv",
    ...buildReviewerPrompt(input, draft.text),
  });
  // Si el revisor falla (cuota, red), devolvemos el borrador: mejor que nada.
  if (!review.ok) {
    return {
      ok: true,
      sections: parseTailorSections(draft.text),
      text: draft.text,
      review: `No se pudo revisar: ${review.error}`,
    };
  }

  const final = await generateAiText({
    surface: "cv",
    ...buildReviserPrompt(input, draft.text, review.text),
  });
  const text = final.ok ? final.text : draft.text;
  return {
    ok: true,
    // Si el corrector rompió el formato, caemos al borrador con secciones.
    sections: parseTailorSections(text) ?? parseTailorSections(draft.text),
    text,
    review: review.text,
  };
}

/** Guarda el CV adaptado como una versión nueva y la asigna a la oportunidad. */
export async function saveTailoredCv(
  opportunityId: string,
  content: string
): Promise<{ ok: true; label: string } | { ok: false; error: string }> {
  if (typeof opportunityId !== "string" || typeof content !== "string") {
    return { ok: false, error: "Datos inválidos." };
  }
  const text = content.trim().slice(0, 100000);
  if (!text) return { ok: false, error: "El CV está vacío." };
  const userId = await currentUserId();
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    select: { id: true, title: true, company: { select: { name: true } } },
  });
  if (!opp) return { ok: false, error: "No encontré la oportunidad." };

  const label = `CV · ${opp.title}${opp.company ? ` · ${opp.company.name}` : ""}`.slice(0, 200);
  await prisma.$transaction(async (tx) => {
    const cv = await tx.cVVersion.create({
      data: { userId, label, content: text, notes: "Adaptado con IA (redactor + revisor)." },
    });
    await tx.opportunity.update({
      where: { id: opp.id },
      data: { cvVersionId: cv.id },
    });
  });
  revalidatePath(`/oportunidades/${opp.id}`);
  revalidatePath("/configuracion");
  return { ok: true, label };
}
