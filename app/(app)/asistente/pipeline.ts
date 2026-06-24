// Contexto del pipeline del track activo, compartido por el asistente
// conversacional (un agente) y por el equipo de agentes (calificador +
// redactor). Una sola lectura de datos, dos consumidores.
//
// NO lleva "use server": exporta tipos y helpers además de funciones async.
// Las Server Actions que lo usan viven en actions.ts y agent-actions.ts.

import { prisma } from "@/lib/prisma";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab, type StageDef, type Track, type TrackVocab } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";
import { relationshipStrengthLabels } from "@/lib/labels";
import { priorityLabels, touchpointTypeLabels } from "@/lib/labels";

const iso = (d: Date) => d.toISOString().slice(0, 10);
export const money = (n: number) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

export type PipelineContact = {
  name: string;
  role: string | null;
  strength: string;
};

export type PipelineOpportunity = {
  title: string;
  company: string | null;
  stageKey: string;
  stageLabel: string;
  priority: string;
  value: number | null;
  followUp: string | null;
  overdue: boolean;
  description: string | null;
  lastTouch: string | null;
  contacts: PipelineContact[];
};

/** Quién sos, qué vendés y cómo querés que la IA escriba. Editable en Configuración. */
export type BusinessProfile = {
  business: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  tone: string;
};

export const BUSINESS_PROFILE_KEYS = [
  "aiBusiness",
  "aiSenderName",
  "aiSenderEmail",
  "aiSenderPhone",
  "aiTone",
] as const;

export type PipelineData = {
  now: Date;
  track: Track;
  vocab: TrackVocab;
  stages: StageDef[];
  opportunities: PipelineOpportunity[];
  contactLines: string[];
  distribution: string;
  forecastLine: string;
  signals: string[];
  counts: { opps: number; companies: number; contacts: number };
  profile: BusinessProfile;
};

/** Bloque de texto con el perfil, para inyectar en cualquier prompt. "" si está vacío. */
export function profilePromptBlock(p: BusinessProfile): string {
  const lines: string[] = [];
  if (p.business) lines.push(`Qué vende / a qué se dedica el usuario: ${p.business}`);
  const signature = [
    p.senderName && `Nombre: ${p.senderName}`,
    p.senderEmail && `Email: ${p.senderEmail}`,
    p.senderPhone && `Teléfono: ${p.senderPhone}`,
  ].filter(Boolean);
  if (signature.length) lines.push(`Datos del remitente (para firmar): ${signature.join(" · ")}`);
  if (p.tone) lines.push(`Estilo de redacción que pide el usuario: ${p.tone}`);
  if (lines.length === 0) return "";
  return `\n--- PERFIL DEL USUARIO Y SU NEGOCIO ---\n${lines.join("\n")}`;
}

/** Una sola foto del embudo del track activo, lista para alimentar a la IA. */
export async function gatherPipeline(): Promise<PipelineData> {
  const now = new Date();
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);
  const stages = await getTrackStages(track);
  const stageByKey = new Map(stages.map((s) => [s.key, s]));
  const labelOf = (key: string) => stageByKey.get(key)?.label ?? key;
  const openKeys = stages.filter((s) => s.type === "open").map((s) => s.key);

  const [opportunities, contacts, companyCount, stageGroups, valued, profileRows] =
    await Promise.all([
      prisma.opportunity.findMany({
        where: { track, stage: { in: openKeys } },
        orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
        take: 40,
        select: {
          title: true,
          stage: true,
          priority: true,
          value: true,
          jobDescription: true,
          nextFollowUpAt: true,
          company: {
            select: {
              name: true,
              contacts: {
                select: {
                  name: true,
                  role: true,
                  relationshipStrength: true,
                },
              },
            },
          },
          touchpoints: {
            orderBy: { occurredAt: "desc" },
            take: 1,
            select: { type: true, note: true, occurredAt: true },
          },
        },
      }),
      prisma.contact.findMany({
        where: { track },
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          name: true,
          role: true,
          relationshipStrength: true,
          nextFollowUpAt: true,
          company: { select: { name: true } },
        },
      }),
      prisma.company.count({ where: { track } }),
      prisma.opportunity.groupBy({
        by: ["stage"],
        where: { track },
        _count: { _all: true },
      }),
      vocab.hasValue
        ? prisma.opportunity.findMany({
            where: { track, value: { not: null } },
            select: { value: true, stage: true },
          })
        : Promise.resolve([] as { value: number | null; stage: string }[]),
      prisma.setting.findMany({
        where: { key: { in: [...BUSINESS_PROFILE_KEYS] } },
        select: { key: true, value: true },
      }),
    ]);

  const profileMap = new Map(profileRows.map((r) => [r.key, r.value]));
  const profile: BusinessProfile = {
    business: profileMap.get("aiBusiness") ?? "",
    senderName: profileMap.get("aiSenderName") ?? "",
    senderEmail: profileMap.get("aiSenderEmail") ?? "",
    senderPhone: profileMap.get("aiSenderPhone") ?? "",
    tone: profileMap.get("aiTone") ?? "",
  };

  // Distribución por etapa
  const countByStage = new Map(stageGroups.map((g) => [g.stage, g._count._all]));
  const distribution = stages
    .map((s) => `${s.label}: ${countByStage.get(s.key) ?? 0}`)
    .join(" · ");

  // Forecast ponderado (solo modos con monto)
  let forecastLine = "";
  if (vocab.hasValue) {
    let pipeline = 0;
    let weighted = 0;
    let won = 0;
    for (const o of valued) {
      const st = stageByKey.get(o.stage);
      const v = o.value ?? 0;
      if (st?.type === "won") won += v;
      else if (st?.type !== "lost") {
        pipeline += v;
        weighted += (v * (st?.probability ?? 0)) / 100;
      }
    }
    forecastLine = `Forecast: ${money(weighted)} ponderado · ${money(pipeline)} en juego · ${money(won)} ganado.`;
  }

  // Oportunidades normalizadas + señales
  let overdueOpps = 0;
  const noContact: string[] = [];
  const normalized: PipelineOpportunity[] = opportunities.map((o) => {
    const overdue = o.nextFollowUpAt != null && o.nextFollowUpAt < now;
    if (overdue) overdueOpps++;
    const contacts: PipelineContact[] = (o.company?.contacts ?? []).map((c) => ({
      name: c.name,
      role: c.role,
      strength: relationshipStrengthLabels[c.relationshipStrength],
    }));
    if (contacts.length === 0) noContact.push(o.title);
    const last = o.touchpoints[0];
    const lastTouch = last
      ? `${touchpointTypeLabels[last.type]} (${iso(last.occurredAt)})${last.note ? `: ${last.note}` : ""}`
      : null;
    return {
      title: o.title,
      company: o.company?.name ?? null,
      stageKey: o.stage,
      stageLabel: labelOf(o.stage),
      priority: priorityLabels[o.priority],
      value: o.value,
      followUp: o.nextFollowUpAt ? iso(o.nextFollowUpAt) : null,
      overdue,
      description: o.jobDescription,
      lastTouch,
      contacts,
    };
  });

  const contactLines: string[] = [];
  let overdueContacts = 0;
  for (const c of contacts) {
    const parts = [
      `- ${c.name}${c.role ? ` (${c.role})` : ""}${c.company ? ` en ${c.company.name}` : ""}`,
      `vínculo: ${relationshipStrengthLabels[c.relationshipStrength].toLowerCase()}`,
    ];
    if (c.nextFollowUpAt) {
      const overdue = c.nextFollowUpAt < now;
      if (overdue) overdueContacts++;
      parts.push(`follow-up: ${iso(c.nextFollowUpAt)}${overdue ? " (VENCIDO)" : ""}`);
    }
    contactLines.push(parts.join(" · "));
  }

  const signals: string[] = [];
  if (overdueOpps + overdueContacts > 0)
    signals.push(
      `Hay ${overdueOpps + overdueContacts} follow-ups VENCIDOS (${overdueOpps} en ${vocab.oppPlural.toLowerCase()}, ${overdueContacts} en contactos): son lo más urgente.`
    );
  if (noContact.length > 0)
    signals.push(
      `${noContact.length} ${vocab.oppPlural.toLowerCase()} sin ningún contacto identificado: ${noContact.slice(0, 5).join(", ")}.`
    );

  return {
    now,
    track,
    vocab,
    stages,
    opportunities: normalized,
    contactLines,
    distribution,
    forecastLine,
    signals,
    counts: {
      opps: opportunities.length,
      companies: companyCount,
      contacts: contacts.length,
    },
    profile,
  };
}

/** Arma el system prompt del asistente conversacional desde la foto del pipeline. */
export function buildChatSystemPrompt(data: PipelineData): string {
  const { vocab, stages } = data;
  const oppLines = data.opportunities.map((o) => {
    const parts = [
      `- ${o.title}${o.company ? ` (${o.company})` : ""}`,
      `etapa: ${o.stageLabel}`,
      `prioridad: ${o.priority.toLowerCase()}`,
    ];
    if (vocab.hasValue && o.value != null) parts.push(`monto: ${money(o.value)}`);
    if (o.followUp) {
      parts.push(`follow-up: ${o.followUp}${o.overdue ? " (VENCIDO)" : ""}`);
    } else {
      parts.push("sin follow-up agendado");
    }
    return parts.join(" · ");
  });

  const context = [
    `Fecha de hoy: ${iso(data.now)}`,
    `Modo activo: ${vocab.name}. La entidad central se llama "${vocab.oppSingular}" y las empresas/cuentas se llaman "${vocab.companyPlural}".`,
    `Etapas del embudo: ${stages.map((s) => s.label).join(" → ")}.`,
    `Resumen: ${data.counts.opps} ${vocab.oppPlural.toLowerCase()} activas · ${data.counts.companies} ${vocab.companyPlural.toLowerCase()} · ${data.counts.contacts} contactos.`,
    `Distribución por etapa: ${data.distribution}.`,
    data.forecastLine,
    data.signals.length
      ? `\nSEÑALES PARA RECOMENDAR:\n- ${data.signals.join("\n- ")}`
      : "",
    "",
    `${vocab.oppPlural} activas (${oppLines.length}):`,
    oppLines.length ? oppLines.join("\n") : "(ninguna cargada)",
    "",
    `Contactos (${data.contactLines.length} más recientes):`,
    data.contactLines.length ? data.contactLines.join("\n") : "(ninguno cargado)",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "Sos el asistente de Konexo, un CRM personal local-first que corre en la máquina del usuario.",
    "Konexo es multi-modo: la misma estructura (empresas/cuentas → oportunidades → contactos → seguimientos) sirve para distintos objetivos. Hoy el usuario está en un modo concreto; usá SIEMPRE su vocabulario y sus etapas (te los paso abajo).",
    `Tu trabajo: ayudarlo a avanzar su embudo en modo "${vocab.name}". Eso incluye: redactar mensajes (LinkedIn, email, follow-up, propuestas, pedidos de referido), decidir próximos pasos, priorizar, y dar recomendaciones proactivas basadas en sus datos reales.`,
    "Cuando tenga sentido, recomendá acciones concretas: empezá por los follow-ups vencidos, después las oportunidades sin contacto, y aprovechá el forecast para priorizar por monto.",
    "Respondé en español, en texto plano sin Markdown (la interfaz no lo renderiza). Sé concreto y breve; cuando redactes un mensaje, entregalo listo para copiar y pegar.",
    "Usá el contexto real cuando sea relevante, pero no lo recites entero ni inventes datos que no estén. Si te falta info para una recomendación, pedila.",
    "Cuando redactes mensajes, respetá el estilo del usuario y firmá con sus datos si los tenés (te los paso en su perfil).",
    profilePromptBlock(data.profile),
    "",
    "--- CONTEXTO REAL DEL USUARIO ---",
    context,
  ]
    .filter(Boolean)
    .join("\n");
}
