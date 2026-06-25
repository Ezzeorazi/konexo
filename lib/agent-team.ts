// Equipo de agentes de Konexo.
//
// A diferencia del asistente conversacional (un solo agente que responde lo que
// le preguntás), acá hay varios agentes ESPECIALIZADOS que un orquestador
// coordina sobre los datos reales del embudo:
//
//   1. CALIFICADOR  → lee las oportunidades abiertas y las prioriza (tier + score).
//   2. ORQUESTADOR  → elige las más calientes y se las reparte al redactor.
//   3. REDACTOR     → escribe el borrador de contacto de cada una, EN PARALELO.
//
// El paralelismo real (Promise.all) vive dentro de una sola Server Function,
// que es como Next recomienda hacer trabajo concurrente del lado del servidor.

import { generateAiChat, getAiConfig } from "@/lib/ai";
import { getAgentPlaybook } from "@/lib/agent-playbooks";
import {
  money,
  profilePromptBlock,
  deliveryBrief,
  type PipelineData,
  type PipelineOpportunity,
} from "@/app/(app)/asistente/pipeline";

export type Tier = "hot" | "warm" | "cold";

export type Qualification = {
  title: string;
  company: string | null;
  stageLabel: string;
  tier: Tier;
  score: number;
  reason: string;
  nextAction: string;
  overdue: boolean;
};

export type Draft = {
  title: string;
  company: string | null;
  channel: string;
  subject: string | null;
  body: string;
};

export type AgentStep = {
  agent: "orquestador" | "calificador" | "redactor";
  text: string;
  /** true si este paso engloba trabajo concurrente. */
  parallel?: boolean;
};

export type AgentTeamResult =
  | {
      ok: true;
      qualifications: Qualification[];
      drafts: Draft[];
      steps: AgentStep[];
      providerLabel: string;
    }
  | { ok: false; error: string; steps: AgentStep[] };

const MAX_TO_QUALIFY = 25;
const MAX_TO_DRAFT = 3;

/** Extrae el primer bloque JSON (objeto o array) de la respuesta del modelo. */
function extractJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  // Buscamos el primer [ o { y su cierre balanceado.
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function oppToBrief(o: PipelineOpportunity, vocabHasValue: boolean): string {
  const parts = [
    `etapa: ${o.stageLabel}`,
    `prioridad: ${o.priority}`,
    o.followUp
      ? `follow-up: ${o.followUp}${o.overdue ? " (VENCIDO)" : ""}`
      : "sin follow-up agendado",
  ];
  if (vocabHasValue && o.value != null) parts.push(`monto: ${money(o.value)}`);
  parts.push(
    o.contacts.length
      ? `contactos: ${o.contacts
          .map((c) => `${c.name}${c.role ? ` (${c.role})` : ""} [${c.strength}]`)
          .join("; ")}`
      : "sin contacto identificado"
  );
  if (o.lastTouch) parts.push(`último toque: ${o.lastTouch}`);
  const delivery = deliveryBrief(o.delivery);
  if (delivery) parts.push(`ejecución → ${delivery}`);
  if (o.description) parts.push(`contexto: ${o.description.slice(0, 280)}`);
  return parts.join(" · ");
}

/** AGENTE 1 — Calificador: prioriza las oportunidades abiertas. */
async function runCalificador(
  data: PipelineData,
  opps: PipelineOpportunity[]
): Promise<Qualification[] | null> {
  const { vocab } = data;
  const list = opps
    .map((o, i) => `${i}. ${o.title}${o.company ? ` — ${o.company}` : ""} · ${oppToBrief(o, vocab.hasValue)}`)
    .join("\n");

  const system = [
    `Sos el AGENTE CALIFICADOR de un equipo de IA dentro de Konexo, un CRM en modo "${vocab.name}".`,
    `Tu ÚNICA función es calificar y priorizar las ${vocab.oppPlural.toLowerCase()} abiertas del usuario. NO redactás mensajes: de eso se encarga otro agente.`,
    "Calificá según probabilidad de avanzar Y urgencia. Un follow-up VENCIDO o una oportunidad de alto monto sin avance reciente sube la prioridad. Una sin contacto identificado puede ser caliente igual, pero el próximo paso será conseguir ese contacto.",
    `Criterio para modo ${vocab.name}: ${getAgentPlaybook(data.track).qualifier}`,
    "Usá el perfil del usuario (qué vende) para juzgar el fit: una oportunidad alineada con lo que ofrece vale más.",
    "Devolvé SOLO un JSON válido (sin texto antes ni después, sin Markdown) con esta forma:",
    `[{"i": <número de la lista>, "tier": "hot"|"warm"|"cold", "score": <0-100>, "reason": "<por qué, máx 18 palabras>", "nextAction": "<próximo paso concreto, imperativo, máx 14 palabras>"}]`,
    "Incluí TODAS las oportunidades de la lista. Ordená de mayor a menor score.",
    profilePromptBlock(data.profile),
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Estas son las ${vocab.oppPlural.toLowerCase()} abiertas a calificar:\n\n${list}`;

  const res = await generateAiChat({ system, messages: [{ role: "user", content: prompt }] });
  if (!res.ok) return null;

  type Raw = { i: number; tier: string; score: number; reason: string; nextAction: string };
  const raw = extractJson<Raw[]>(res.text);
  if (!Array.isArray(raw)) return null;

  const norm = (t: string): Tier =>
    t === "hot" || t === "warm" || t === "cold" ? t : "warm";

  const out: Qualification[] = [];
  for (const r of raw) {
    const o = opps[r.i];
    if (!o) continue;
    out.push({
      title: o.title,
      company: o.company,
      stageLabel: o.stageLabel,
      tier: norm(String(r.tier)),
      score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
      reason: String(r.reason ?? "").trim(),
      nextAction: String(r.nextAction ?? "").trim(),
      overdue: o.overdue,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/** AGENTE 2 — Redactor: escribe el borrador de contacto de UNA oportunidad. */
async function runRedactor(
  data: PipelineData,
  opp: PipelineOpportunity,
  q: Qualification
): Promise<Draft | null> {
  const { vocab } = data;
  const contact = opp.contacts[0];

  const system = [
    `Sos el AGENTE REDACTOR de un equipo de IA dentro de Konexo, un CRM en modo "${vocab.name}".`,
    "Otro agente ya calificó las oportunidades; vos recibís UNA y escribís el borrador de contacto listo para enviar.",
    `Guía de redacción para modo ${vocab.name}: ${getAgentPlaybook(data.track).drafter}`,
    "Reglas: por defecto español rioplatense y tono cálido y profesional, PERO si el usuario definió un estilo propio en su perfil, respetalo por encima de esto. Personalizá con el contexto real y con lo que el usuario vende; nunca inventes datos (nombres, montos, fechas) que no te pasen. Si no hay un contacto identificado, escribí un mensaje de apertura para iniciar la relación.",
    "Si el perfil trae datos del remitente (nombre, email, teléfono), cerrá el mensaje con una firma usando esos datos. Si no los tenés, no inventes una firma.",
    "Elegí el canal más natural: email, linkedin o whatsapp.",
    'Devolvé SOLO un JSON válido (sin texto extra, sin Markdown): {"channel": "email"|"linkedin"|"whatsapp", "subject": "<asunto si es email, si no \\"\\">", "body": "<mensaje listo para copiar y pegar>"}',
    profilePromptBlock(data.profile),
  ]
    .filter(Boolean)
    .join("\n");

  const ctx = [
    `Oportunidad: ${opp.title}${opp.company ? ` (${opp.company})` : ""}`,
    `Etapa: ${opp.stageLabel}`,
    contact
      ? `Contacto: ${contact.name}${contact.role ? `, ${contact.role}` : ""} (vínculo ${contact.strength})`
      : "Sin contacto identificado todavía.",
    opp.lastTouch ? `Último toque: ${opp.lastTouch}` : "Sin interacciones registradas.",
    deliveryBrief(opp.delivery) ? `Estado de ejecución: ${deliveryBrief(opp.delivery)}` : "",
    opp.description ? `Contexto: ${opp.description.slice(0, 400)}` : "",
    `El calificador dijo: ${q.reason}. Próximo paso sugerido: ${q.nextAction}.`,
    "",
    "Escribí ese borrador.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await generateAiChat({ system, messages: [{ role: "user", content: ctx }] });
  if (!res.ok) return null;

  type Raw = { channel?: string; subject?: string; body?: string };
  const raw = extractJson<Raw>(res.text);
  const body = raw?.body?.trim();
  if (!body) {
    // Fallback: si no vino JSON, usamos el texto crudo como cuerpo.
    const fallback = res.text.trim();
    if (!fallback) return null;
    return { title: opp.title, company: opp.company, channel: "mensaje", subject: null, body: fallback };
  }
  const channel = ["email", "linkedin", "whatsapp"].includes(String(raw?.channel))
    ? String(raw?.channel)
    : "mensaje";
  const subject = channel === "email" && raw?.subject ? String(raw.subject).trim() : null;
  return { title: opp.title, company: opp.company, channel, subject, body };
}

/** Orquesta al equipo completo sobre el embudo del track activo. */
export async function runAgentTeam(data: PipelineData): Promise<AgentTeamResult> {
  const steps: AgentStep[] = [];
  const { vocab } = data;
  const config = await getAiConfig();
  const providerLabel = `${config.provider} · ${config.model}`;

  const opps = data.opportunities.slice(0, MAX_TO_QUALIFY);
  if (opps.length === 0) {
    return {
      ok: false,
      error: `No hay ${vocab.oppPlural.toLowerCase()} abiertas para calificar. Cargá alguna y volvé a intentar.`,
      steps,
    };
  }

  steps.push({
    agent: "orquestador",
    text: `Reparto del trabajo: ${opps.length} ${vocab.oppPlural.toLowerCase()} abiertas. Despierto al Calificador.`,
  });

  const qualifications = await runCalificador(data, opps);
  if (!qualifications || qualifications.length === 0) {
    return {
      ok: false,
      error:
        "El Calificador no pudo procesar el embudo (¿falta configurar el proveedor de IA en Configuración, o el modelo devolvió un formato inesperado?).",
      steps,
    };
  }

  steps.push({
    agent: "calificador",
    text: `Califiqué ${qualifications.length} ${vocab.oppPlural.toLowerCase()}: ${
      qualifications.filter((q) => q.tier === "hot").length
    } calientes, ${qualifications.filter((q) => q.tier === "warm").length} tibias, ${
      qualifications.filter((q) => q.tier === "cold").length
    } frías.`,
  });

  // El orquestador elige a quién contactar primero.
  const top = qualifications.slice(0, MAX_TO_DRAFT);
  const byTitle = new Map(opps.map((o) => [o.title, o]));

  steps.push({
    agent: "orquestador",
    text: `Selecciono las ${top.length} más prioritarias y se las paso al Redactor para que escriba los borradores en paralelo.`,
    parallel: true,
  });

  // AGENTES EN PARALELO: el redactor escribe los N borradores a la vez.
  const drafts = (
    await Promise.all(
      top.map((q) => {
        const o = byTitle.get(q.title);
        return o ? runRedactor(data, o, q) : Promise.resolve(null);
      })
    )
  ).filter((d): d is Draft => d !== null);

  steps.push({
    agent: "redactor",
    text: drafts.length
      ? `Listo: ${drafts.length} borrador${drafts.length > 1 ? "es" : ""} para copiar y enviar.`
      : "No pude generar borradores esta vez.",
  });

  return { ok: true, qualifications, drafts, steps, providerLabel };
}
