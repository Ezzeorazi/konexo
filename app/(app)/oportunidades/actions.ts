"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { track as trackEvent } from "@/lib/analytics";
import { maybeTrackActivation } from "@/lib/activation";
import { generateAiText } from "@/lib/ai";
import { parseDateInput } from "@/lib/dates";
import { normalizeUrl } from "@/lib/utils";
import { isTrack, DEFAULT_TRACK } from "@/lib/tracks";
import type { Priority } from "@/lib/generated/prisma/client";

export type OpportunityInput = {
  title: string;
  track?: string;
  companyId?: string;
  stage: string;
  url?: string;
  location?: string;
  salaryRange?: string;
  value?: string;
  jobDescription?: string;
  priority: Priority;
  appliedAt?: string; // yyyy-MM-dd
  nextFollowUpAt?: string; // yyyy-MM-dd
  cvVersionId?: string;
  notes?: string;
};

function clean(input: OpportunityInput) {
  const parsedValue =
    input.value && input.value.trim()
      ? Number(input.value.replace(/[^\d.,-]/g, "").replace(",", "."))
      : null;
  return {
    title: input.title.trim(),
    companyId: input.companyId || null,
    stage: input.stage,
    url: normalizeUrl(input.url),
    location: input.location?.trim() || null,
    salaryRange: input.salaryRange?.trim() || null,
    value: parsedValue !== null && !Number.isNaN(parsedValue) ? parsedValue : null,
    jobDescription: input.jobDescription?.trim() || null,
    priority: input.priority,
    appliedAt: parseDateInput(input.appliedAt),
    nextFollowUpAt: parseDateInput(input.nextFollowUpAt),
    cvVersionId: input.cvVersionId || null,
    notes: input.notes?.trim() || null,
  };
}

export async function createOpportunity(input: OpportunityInput) {
  if (!input.title?.trim()) {
    return { ok: false as const, error: "El título es obligatorio." };
  }
  const track = isTrack(input.track) ? input.track : DEFAULT_TRACK;
  const userId = await currentUserId();
  const opportunity = await prisma.opportunity.create({
    data: { ...clean(input), track, userId },
  });
  await trackEvent(userId, "opportunity_created", { track });
  await maybeTrackActivation(userId);
  revalidatePath("/oportunidades");
  return { ok: true as const, id: opportunity.id };
}

export async function updateOpportunity(id: string, input: OpportunityInput) {
  if (!input.title?.trim()) {
    return { ok: false as const, error: "El título es obligatorio." };
  }
  const userId = await currentUserId();
  const { count } = await prisma.opportunity.updateMany({
    where: { id, userId },
    data: clean(input),
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré la oportunidad." };
  }
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
  return { ok: true as const, id };
}

export async function deleteOpportunity(id: string) {
  const userId = await currentUserId();
  await prisma.opportunity.deleteMany({ where: { id, userId } });
  revalidatePath("/oportunidades");
  return { ok: true as const };
}

export async function tailorCv(opportunityId: string) {
  const userId = await currentUserId();
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    include: { company: true, cvVersion: true },
  });
  if (!opportunity) {
    return { ok: false as const, error: "No encontré la oportunidad." };
  }
  if (!opportunity.jobDescription?.trim()) {
    return {
      ok: false as const,
      error:
        "Esta oportunidad no tiene descripción del puesto. Agregala desde “Editar” para poder adaptar tu CV.",
    };
  }
  if (!opportunity.cvVersion?.content?.trim()) {
    return {
      ok: false as const,
      error:
        "La oportunidad no tiene una versión de CV con contenido. Creá una versión de CV en Configuración pegando el texto de tu CV, y asignala desde “Editar”.",
    };
  }

  return generateAiText({
    system:
      "Sos un experto en reclutamiento y redacción de CVs. Ayudás a adaptar el CV de una persona a un aviso de trabajo concreto. Respondés en español, en texto plano sin Markdown, de forma directa y accionable. Nunca inventás experiencia que la persona no tiene.",
    prompt: [
      `Puesto: ${opportunity.title}${opportunity.company ? ` en ${opportunity.company.name}` : ""}`,
      "",
      "--- DESCRIPCIÓN DEL AVISO ---",
      opportunity.jobDescription.trim(),
      "",
      "--- CV ACTUAL ---",
      opportunity.cvVersion.content.trim(),
      "",
      "--- TAREA ---",
      "1. Listá las 3-5 keywords o requisitos del aviso que el CV todavía no refleja bien.",
      "2. Sugerí cambios concretos: qué bullets reescribir y cómo (mostrá el antes y el después).",
      "3. Proponé un resumen profesional de 2-3 líneas adaptado a este puesto.",
    ].join("\n"),
  });
}

export async function updateOpportunityStage(id: string, stage: string) {
  const userId = await currentUserId();
  const data: { stage: string; appliedAt?: Date } = { stage };
  // Si pasa a Aplicada y no tenía fecha, la marcamos ahora (solo búsqueda laboral).
  if (stage === "APPLIED") {
    const current = await prisma.opportunity.findFirst({
      where: { id, userId },
      select: { appliedAt: true },
    });
    if (current && !current.appliedAt) data.appliedAt = new Date();
  }
  await prisma.opportunity.updateMany({ where: { id, userId }, data });
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
  return { ok: true as const };
}
