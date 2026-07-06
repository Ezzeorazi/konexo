"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { track as trackEvent } from "@/lib/analytics";
import { maybeTrackActivation } from "@/lib/activation";
import { generateAiText } from "@/lib/ai";
import { INJECTION_GUARD, userData } from "@/lib/prompt-safety";
import { parseDateInput, parseDateTimeInput } from "@/lib/dates";
import { normalizeUrl } from "@/lib/utils";
import { isTrack, DEFAULT_TRACK, getVocab, type Track } from "@/lib/tracks";
import { completeMission } from "@/lib/onboarding";
import {
  projectKindLabels,
  projectNoteKindLabels,
  touchpointTypeLabels,
  type ProjectKind,
  type ProjectNoteKind,
} from "@/lib/labels";
import { OpportunitySchema, firstZodError } from "@/lib/validation";
import type { Priority } from "@/lib/generated/prisma/client";

export type OpportunityInput = {
  title: string;
  track?: string;
  companyId?: string;
  stage: string;
  kind?: string; // client | own (solo aplica a tracks con entrega)
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
    kind: input.kind === "own" ? "own" : "client",
    url: normalizeUrl(input.url),
    location: input.location?.trim() || null,
    salaryRange: input.salaryRange?.trim() || null,
    value: parsedValue !== null && !Number.isNaN(parsedValue) ? parsedValue : null,
    jobDescription: input.jobDescription?.trim() || null,
    priority: input.priority,
    appliedAt: parseDateInput(input.appliedAt),
    nextFollowUpAt: parseDateTimeInput(input.nextFollowUpAt),
    cvVersionId: input.cvVersionId || null,
    notes: input.notes?.trim() || null,
  };
}

export async function createOpportunity(input: OpportunityInput) {
  const parsed = OpportunitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const track = isTrack(input.track) ? input.track : DEFAULT_TRACK;
  const userId = await currentUserId();
  const opportunity = await prisma.opportunity.create({
    data: { ...clean(input), track, userId },
  });
  await trackEvent(userId, "opportunity_created", { track });
  // Si la oportunidad ya nace con follow-up agendado, dispara "Fijar Radar".
  if (opportunity.nextFollowUpAt) await completeMission(userId, "setRadar");
  await maybeTrackActivation(userId);
  revalidatePath("/oportunidades");
  return { ok: true as const, id: opportunity.id };
}

export async function updateOpportunity(id: string, input: OpportunityInput) {
  const parsed = OpportunitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
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

// --- Edición in-context (un campo a la vez) ---------------------------------
// Los componentes <Editable*> guardan un solo campo. Validamos contra el mismo
// OpportunitySchema (mensajes consistentes) y normalizamos igual que clean().

const OPPORTUNITY_FIELDS = [
  "title",
  "companyId",
  "stage",
  "kind",
  "accentColor",
  "accentEmoji",
  "url",
  "location",
  "salaryRange",
  "value",
  "jobDescription",
  "priority",
  "appliedAt",
  "nextFollowUpAt",
  "cvVersionId",
  "notes",
] as const;

export type OpportunityField = (typeof OPPORTUNITY_FIELDS)[number];

function cleanOpportunityField(
  field: OpportunityField,
  value: string
): Record<string, unknown> {
  switch (field) {
    case "title":
      return { title: value.trim() };
    case "companyId":
      return { companyId: value || null };
    case "stage":
      return { stage: value };
    case "kind":
      return { kind: value === "own" ? "own" : "client" };
    case "accentColor":
      return { accentColor: value.trim() || null };
    case "accentEmoji":
      return { accentEmoji: value.trim() || null };
    case "url":
      return { url: normalizeUrl(value) };
    case "location":
      return { location: value.trim() || null };
    case "salaryRange":
      return { salaryRange: value.trim() || null };
    case "value": {
      const parsed = value.trim()
        ? Number(value.replace(/[^\d.,-]/g, "").replace(",", "."))
        : null;
      return {
        value: parsed !== null && !Number.isNaN(parsed) ? parsed : null,
      };
    }
    case "jobDescription":
      return { jobDescription: value.trim() || null };
    case "priority":
      return { priority: value as Priority };
    case "appliedAt":
      return { appliedAt: parseDateInput(value) };
    case "nextFollowUpAt":
      return { nextFollowUpAt: parseDateTimeInput(value) };
    case "cvVersionId":
      return { cvVersionId: value || null };
    case "notes":
      return { notes: value.trim() || null };
  }
}

export async function patchOpportunityField(
  id: string,
  field: OpportunityField,
  value: string
) {
  if (!OPPORTUNITY_FIELDS.includes(field)) {
    return { ok: false as const, error: "Campo no editable." };
  }
  const mask = { [field]: true } as { [K in OpportunityField]?: true };
  const parsed = OpportunitySchema.pick(mask).safeParse({ [field]: value });
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }

  const userId = await currentUserId();
  const data = cleanOpportunityField(field, value);

  // Misma regla que updateOpportunityStage: al pasar a "Aplicada" sin fecha, la
  // fijamos ahora (búsqueda laboral).
  if (field === "stage" && value === "APPLIED") {
    const current = await prisma.opportunity.findFirst({
      where: { id, userId },
      select: { appliedAt: true },
    });
    if (current && !current.appliedAt) data.appliedAt = new Date();
  }

  const { count } = await prisma.opportunity.updateMany({
    where: { id, userId },
    data,
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré la oportunidad." };
  }
  // Configurar un follow-up desde la edición in-context cuenta como "Fijar Radar".
  if (field === "nextFollowUpAt" && parseDateTimeInput(value)) {
    await completeMission(userId, "setRadar");
  }
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
  return { ok: true as const };
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
    system: [
      "Sos un experto en reclutamiento y redacción de CVs. Ayudás a adaptar el CV de una persona a un aviso de trabajo concreto. Respondés en español, en texto plano sin Markdown, de forma directa y accionable. Nunca inventás experiencia que la persona no tiene.",
      INJECTION_GUARD,
    ].join("\n"),
    prompt: [
      `Puesto: ${opportunity.title}${opportunity.company ? ` en ${opportunity.company.name}` : ""}`,
      "",
      "--- DESCRIPCIÓN DEL AVISO ---",
      userData(opportunity.jobDescription, 6000),
      "",
      "--- CV ACTUAL ---",
      userData(opportunity.cvVersion.content, 6000),
      "",
      "--- TAREA ---",
      "1. Listá las 3-5 keywords o requisitos del aviso que el CV todavía no refleja bien.",
      "2. Sugerí cambios concretos: qué bullets reescribir y cómo (mostrá el antes y el después).",
      "3. Proponé un resumen profesional de 2-3 líneas adaptado a este puesto.",
    ].join("\n"),
  });
}

/**
 * "Ponme al día": en vez de redactar un mensaje, la IA resume el estado real de
 * UN proyecto (tareas, bitácora, timeline) y te da una guía para retomarlo.
 * Pensado para el modo freelance, donde un proyecto puede ser propio o de cliente.
 */
export async function catchMeUp(opportunityId: string): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const userId = await currentUserId();
  const o = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    include: {
      company: true,
      projectTasks: { orderBy: [{ done: "asc" }, { order: "asc" }] },
      projectNotes: { orderBy: { createdAt: "desc" }, take: 10 },
      touchpoints: { orderBy: { occurredAt: "desc" }, take: 5 },
    },
  });
  if (!o) return { ok: false as const, error: "No encontré el proyecto." };

  const track = (isTrack(o.track) ? o.track : DEFAULT_TRACK) as Track;
  const vocab = getVocab(track);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const isOwn = o.kind === "own";

  const pending = o.projectTasks.filter((t) => !t.done);
  const done = o.projectTasks.filter((t) => t.done);

  const ctx = [
    `Proyecto: ${o.title}${o.company ? ` (${o.company.name})` : ""}`,
    vocab.hasDelivery
      ? `Tipo: ${projectKindLabels[(o.kind as ProjectKind) ?? "client"]}`
      : "",
    `Etapa: ${o.stage}`,
    o.value != null ? `Monto: ${o.value.toLocaleString("es-AR")}` : "",
    o.nextFollowUpAt
      ? `Próximo follow-up: ${iso(o.nextFollowUpAt)}${o.nextFollowUpAt < new Date() ? " (VENCIDO)" : ""}`
      : "Sin follow-up agendado.",
    o.jobDescription ? `Alcance/contexto: ${userData(o.jobDescription, 800)}` : "",
    o.notes ? `Notas: ${userData(o.notes, 800)}` : "",
    "",
    `Tareas hechas (${done.length}): ${done.map((t) => t.title).join("; ") || "—"}`,
    `Tareas pendientes (${pending.length}): ${pending.map((t) => t.title).join("; ") || "—"}`,
    "",
    "Bitácora (más reciente primero):",
    o.projectNotes.length
      ? o.projectNotes
          .map(
            (n) =>
              `- [${projectNoteKindLabels[n.kind as ProjectNoteKind] ?? n.kind}] ${iso(n.createdAt)}: ${userData(n.body, 300)}`
          )
          .join("\n")
      : "(sin entradas)",
    "",
    "Timeline reciente:",
    o.touchpoints.length
      ? o.touchpoints
          .map(
            (t) =>
              `- ${touchpointTypeLabels[t.type]} (${iso(t.occurredAt)})${t.note ? `: ${userData(t.note, 200)}` : ""}`
          )
          .join("\n")
      : "(sin interacciones)",
  ]
    .filter(Boolean)
    .join("\n");

  const system = [
    "Sos el asistente de Konexo, un CRM personal local-first. Tu tarea ahora NO es redactar un mensaje: es poner al usuario al día con UN proyecto leyendo su estado real, para que pueda retomarlo en minutos.",
    "Respondé en español, en texto plano sin Markdown (la interfaz no lo renderiza). Sé concreto y breve. No inventes datos que no estén en el contexto.",
    isOwn
      ? "Este es un proyecto PROPIO del usuario (lo trabaja él, usa Konexo para registrar avances). No hay un cliente a quien escribirle: no propongas mensajes de outreach, enfocate en la ejecución."
      : "Este es un proyecto DE CLIENTE. No redactes un mensaje para el cliente salvo que el usuario lo pida después; ahora solo ponelo al día.",
    "Estructurá la respuesta así: 1) Estado en 2-3 líneas. 2) Último avance. 3) Qué falta (pendientes). 4) Próximos 2-3 pasos concretos. 5) Riesgos o cosas trabadas (si hay).",
    INJECTION_GUARD,
  ].join("\n");

  return generateAiText({ system, prompt: ctx });
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
