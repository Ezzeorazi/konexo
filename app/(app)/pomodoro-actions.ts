"use server";

import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab } from "@/lib/tracks";
import { formatOverdue } from "@/lib/dates";

// Sugerencias CONCRETAS para el bloque de foco del Pomodoro, armadas con datos
// reales del modo activo (nombres de verdad): follow-ups vencidos, tareas
// pendientes del proyecto y oportunidades sin contacto. Si no hay nada, devuelve
// [] y el widget cae a las sugerencias genéricas.
export async function getFocusSuggestions(): Promise<string[]> {
  const userId = await currentUserId();
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);
  const now = new Date();
  const openLimit = 6;

  const [overdueOpps, overdueContacts, pendingTasks] = await Promise.all([
    prisma.opportunity.findMany({
      where: { userId, track, nextFollowUpAt: { not: null, lt: now } },
      orderBy: { nextFollowUpAt: "asc" },
      take: openLimit,
      select: {
        title: true,
        nextFollowUpAt: true,
        company: { select: { name: true } },
      },
    }),
    prisma.contact.findMany({
      where: { userId, track, nextFollowUpAt: { not: null, lt: now } },
      orderBy: { nextFollowUpAt: "asc" },
      take: openLimit,
      select: { name: true, nextFollowUpAt: true },
    }),
    vocab.hasDelivery
      ? prisma.projectTask.findMany({
          where: { userId, done: false, opportunity: { track } },
          orderBy: { order: "asc" },
          take: openLimit,
          select: { title: true, opportunity: { select: { title: true } } },
        })
      : Promise.resolve(
          [] as { title: string; opportunity: { title: string } }[]
        ),
  ]);

  const suggestions: string[] = [];

  for (const o of overdueOpps) {
    if (!o.nextFollowUpAt) continue;
    const who = o.company?.name ? `${o.title} (${o.company.name})` : o.title;
    suggestions.push(
      `Ponete al día con "${who}": follow-up ${formatOverdue(o.nextFollowUpAt)}.`
    );
  }
  for (const c of overdueContacts) {
    if (!c.nextFollowUpAt) continue;
    suggestions.push(
      `Escribile a ${c.name}: follow-up ${formatOverdue(c.nextFollowUpAt)}.`
    );
  }
  for (const t of pendingTasks) {
    suggestions.push(`Avanzá "${t.title}" en ${t.opportunity.title}.`);
  }

  // Intercalamos para que no queden todos los del mismo tipo juntos.
  return interleave(suggestions, overdueOpps.length, overdueContacts.length);
}

// Reordena para alternar tipos: primero un vencido de oportunidad, luego uno de
// contacto, luego una tarea, y así. Mantiene variedad en la rotación del widget.
function interleave(all: string[], oppCount: number, contactCount: number) {
  const opps = all.slice(0, oppCount);
  const contacts = all.slice(oppCount, oppCount + contactCount);
  const tasks = all.slice(oppCount + contactCount);
  const out: string[] = [];
  const max = Math.max(opps.length, contacts.length, tasks.length);
  for (let i = 0; i < max; i++) {
    if (opps[i]) out.push(opps[i]);
    if (contacts[i]) out.push(contacts[i]);
    if (tasks[i]) out.push(tasks[i]);
  }
  return out;
}
