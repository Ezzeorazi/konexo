"use server";

import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";
import { generateAiText } from "@/lib/ai";
import { INJECTION_GUARD, userData } from "@/lib/prompt-safety";
import {
  touchpointTypeLabels,
  INTERNAL_TOUCHPOINT_TYPES,
} from "@/lib/labels";

// "Cierre del día": junta todo lo que avanzaste HOY en el modo activo (touch-
// points, avances de bitácora, oportunidades/contactos nuevos o movidos) y le
// pide a la IA un repaso checkeable + qué conviene encarar mañana. Scopeado al
// track activo, igual que el resto del asistente.

export async function dailyReview(): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const userId = await currentUserId();
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);
  const stages = await getTrackStages(track);
  const stageLabel = (key: string) =>
    stages.find((s) => s.key === key)?.label ?? key;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const hhmm = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;

  const [
    activity,
    newOpps,
    movedOpps,
    newContacts,
    newCompanies,
    tasksDone,
    overdueOpps,
    overdueContacts,
  ] = await Promise.all([
    // Actividad registrada hoy (ligada a una entidad de este modo). Incluye
    // interacciones Y bitácora interna (IDEA/AVANCE); se separan abajo por tipo.
    prisma.touchpoint.findMany({
      where: {
        userId,
        occurredAt: { gte: startOfToday },
        OR: [{ opportunity: { track } }, { contact: { track } }],
      },
      orderBy: { occurredAt: "asc" },
      select: {
        type: true,
        note: true,
        occurredAt: true,
        opportunity: { select: { title: true } },
        contact: { select: { name: true } },
      },
    }),
    // Oportunidades creadas hoy.
    prisma.opportunity.findMany({
      where: { userId, track, createdAt: { gte: startOfToday } },
      select: { title: true, company: { select: { name: true } } },
    }),
    // Oportunidades que tocaste/moviste hoy (existían de antes).
    prisma.opportunity.findMany({
      where: {
        userId,
        track,
        createdAt: { lt: startOfToday },
        updatedAt: { gte: startOfToday },
      },
      orderBy: { updatedAt: "asc" },
      select: { title: true, stage: true },
    }),
    prisma.contact.findMany({
      where: { userId, track, createdAt: { gte: startOfToday } },
      select: { name: true, company: { select: { name: true } } },
    }),
    prisma.company.findMany({
      where: { userId, track, createdAt: { gte: startOfToday } },
      select: { name: true },
    }),
    // Tareas de proyecto completadas hoy (solo modos con entrega).
    prisma.projectTask.findMany({
      where: {
        userId,
        done: true,
        completedAt: { gte: startOfToday },
        opportunity: { track },
      },
      orderBy: { completedAt: "asc" },
      select: { title: true, opportunity: { select: { title: true } } },
    }),
    prisma.opportunity.count({
      where: { userId, track, nextFollowUpAt: { not: null, lt: now } },
    }),
    prisma.contact.count({
      where: { userId, track, nextFollowUpAt: { not: null, lt: now } },
    }),
  ]);

  // Actividad (Fase 3): un solo stream, se separa por tipo para el repaso.
  const bitacora = activity.filter((t) =>
    INTERNAL_TOUCHPOINT_TYPES.includes(t.type)
  );
  const interactions = activity.filter(
    (t) => !INTERNAL_TOUCHPOINT_TYPES.includes(t.type)
  );

  const totalActivity =
    interactions.length +
    bitacora.length +
    newOpps.length +
    movedOpps.length +
    newContacts.length +
    newCompanies.length +
    tasksDone.length;

  // Sin actividad: no gastamos una llamada a la IA, respondemos directo.
  if (totalActivity === 0) {
    const overdue = overdueOpps + overdueContacts;
    return {
      ok: true,
      text:
        `Hoy no registré ningún avance en modo ${vocab.name}. ` +
        (overdue > 0
          ? `Eso sí: tenés ${overdue} follow-up(s) vencido(s) esperando. Un buen cierre sería ponerte al día con al menos uno antes de terminar. 💪`
          : `Todavía estás a tiempo: registrá un touchpoint, movné una ${vocab.oppSingular} o anotá un avance y volvé a pedirme el cierre. 💪`),
    };
  }

  const ctx = [
    `Modo: ${vocab.name}. Entidad central: "${vocab.oppSingular}"; empresas/cuentas: "${vocab.companyPlural}".`,
    `Fecha: ${iso(now)}.`,
    "",
    `INTERACCIONES REGISTRADAS HOY (${interactions.length}):`,
    interactions.length
      ? interactions
          .map((t) => {
            const withWhom =
              t.contact?.name ?? t.opportunity?.title ?? "sin vincular";
            return `- ${hhmm(t.occurredAt)} · ${touchpointTypeLabels[t.type]} con ${withWhom}${
              t.note ? `: ${userData(t.note, 200)}` : ""
            }`;
          })
          .join("\n")
      : "(ninguna)",
    "",
    `AVANCES / IDEAS EN BITÁCORA HOY (${bitacora.length}):`,
    bitacora.length
      ? bitacora
          .map(
            (n) =>
              `- [${touchpointTypeLabels[n.type]}] ${
                n.opportunity?.title ? `${n.opportunity.title}: ` : ""
              }${n.note ? userData(n.note, 200) : ""}`
          )
          .join("\n")
      : "(ninguno)",
    "",
    `${vocab.oppPlural.toUpperCase()} NUEVAS HOY (${newOpps.length}): ${
      newOpps.map((o) => o.title + (o.company ? ` (${o.company.name})` : "")).join("; ") ||
      "—"
    }`,
    `${vocab.oppPlural.toUpperCase()} MOVIDAS/EDITADAS HOY (${movedOpps.length}): ${
      movedOpps.map((o) => `${o.title} → ${stageLabel(o.stage)}`).join("; ") || "—"
    }`,
    `TAREAS COMPLETADAS HOY (${tasksDone.length}): ${
      tasksDone
        .map(
          (t) =>
            `${t.title}${t.opportunity?.title ? ` (${t.opportunity.title})` : ""}`
        )
        .join("; ") || "—"
    }`,
    `CONTACTOS NUEVOS HOY (${newContacts.length}): ${
      newContacts.map((c) => c.name).join("; ") || "—"
    }`,
    `${vocab.companyPlural.toUpperCase()} NUEVAS HOY (${newCompanies.length}): ${
      newCompanies.map((c) => c.name).join("; ") || "—"
    }`,
    "",
    `PENDIENTE AHORA: ${overdueOpps + overdueContacts} follow-up(s) vencido(s) (${overdueOpps} en ${vocab.oppPlural.toLowerCase()}, ${overdueContacts} en contactos).`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = [
    "Sos el asistente de Konexo, un CRM personal. Es el cierre del día: tu tarea es hacer un REPASO claro y motivador de lo que la persona avanzó hoy, para que lo pueda revisar de un vistazo.",
    "Respondé en español, en texto plano sin Markdown (la interfaz no lo renderiza). Sé concreto y breve; no inventes nada que no esté en el contexto.",
    "Estructurá la respuesta así:",
    "1) Una línea de cierre con el balance del día (cálido, sin exagerar).",
    "2) 'Lo que avanzaste hoy:' una lista con viñetas '✓', agrupando lo importante (interacciones, avances, altas y movimientos). No repitas ítems vacíos.",
    "3) 'Para mañana:' 2-3 próximos pasos concretos, arrancando por los follow-ups vencidos si los hay.",
    INJECTION_GUARD,
  ].join("\n");

  return generateAiText({ system, prompt: ctx });
}
