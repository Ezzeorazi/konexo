import { prisma } from "@/lib/prisma";
import { getProgress, type OnboardingState } from "@/lib/onboarding";
import type { StageDef } from "@/lib/tracks";

// Carga de datos del Dashboard, separada del render (page.tsx) para poder
// testearla en aislamiento y a escala (Fase 5 · rendimiento). Todas las queries
// van scopeadas por userId+track.

/** Cuántos follow-ups (de oportunidades y de contactos) trae cada lista. */
export const DASHBOARD_FOLLOWUP_TAKE = 10;
/** Tope de "oportunidades sin contacto" del panel. Antes no tenía tope: un
 *  usuario con cientos de oportunidades sin contacto renderizaba todas. */
export const DASHBOARD_NO_CONTACT_TAKE = 20;

export type FollowUp = {
  key: string;
  href: string;
  title: string;
  subtitle: string | null;
  date: Date;
  kind: "opportunity" | "contact";
};

export type Forecast = {
  /** Monto total en juego (etapas abiertas). */
  pipelineValue: number;
  /** Monto ponderado por la probabilidad de cada etapa. */
  weightedValue: number;
  /** Monto ya ganado. */
  wonValue: number;
};

/**
 * Forecast ponderado PURO: Σ(monto × probabilidad) sobre lo abierto; lo ganado
 * se acumula aparte; lo perdido se ignora. Sin dependencias de DB para poder
 * probar la lógica con casos de borde.
 */
export function computeForecast(
  stages: StageDef[],
  valued: { value: number | null; stage: string }[]
): Forecast {
  const stageByKey = new Map(stages.map((s) => [s.key, s]));
  let pipelineValue = 0;
  let weightedValue = 0;
  let wonValue = 0;
  for (const o of valued) {
    const st = stageByKey.get(o.stage);
    const v = o.value ?? 0;
    if (st?.type === "won") wonValue += v;
    else if (st?.type !== "lost") {
      pipelineValue += v;
      weightedValue += (v * (st?.probability ?? 0)) / 100;
    }
  }
  return { pipelineValue, weightedValue, wonValue };
}

export type DashboardData = {
  countByStage: Map<string, number>;
  totalOpportunities: number;
  followUps: FollowUp[];
  overdueCount: number;
  noContactOpps: { id: string; title: string; company: { name: string } | null }[];
  contactCount: number;
  forecast: Forecast;
  onboarding: OnboardingState;
};

export async function getDashboardData(opts: {
  userId: string;
  track: string;
  stages: StageDef[];
  hasValue: boolean;
}): Promise<DashboardData> {
  const { userId, track, stages, hasValue } = opts;
  const lastStageKey = stages[stages.length - 1]?.key ?? "CLOSED";

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

  const [
    stageCounts,
    oppFollowUps,
    contactFollowUps,
    contactCount,
    noContactOpps,
    onboarding,
  ] = await Promise.all([
    prisma.opportunity.groupBy({
      by: ["stage"],
      where: { userId, track },
      _count: { _all: true },
    }),
    prisma.opportunity.findMany({
      where: { userId, track, nextFollowUpAt: { not: null, lte: inTwoWeeks } },
      orderBy: { nextFollowUpAt: "asc" },
      include: { company: { select: { name: true } } },
      take: DASHBOARD_FOLLOWUP_TAKE,
    }),
    prisma.contact.findMany({
      where: { userId, track, nextFollowUpAt: { not: null, lte: inTwoWeeks } },
      orderBy: { nextFollowUpAt: "asc" },
      include: { company: { select: { name: true } } },
      take: DASHBOARD_FOLLOWUP_TAKE,
    }),
    prisma.contact.count({ where: { userId, track } }),
    prisma.opportunity.findMany({
      where: {
        userId,
        track,
        stage: { not: lastStageKey },
        OR: [{ companyId: null }, { company: { contacts: { none: {} } } }],
      },
      orderBy: { updatedAt: "desc" },
      take: DASHBOARD_NO_CONTACT_TAKE,
      select: {
        id: true,
        title: true,
        company: { select: { name: true } },
      },
    }),
    getProgress(userId),
  ]);

  const countByStage = new Map(stageCounts.map((s) => [s.stage, s._count._all]));
  const totalOpportunities = stageCounts.reduce((acc, s) => acc + s._count._all, 0);

  let forecast: Forecast = { pipelineValue: 0, weightedValue: 0, wonValue: 0 };
  if (hasValue) {
    const valued = await prisma.opportunity.findMany({
      where: { userId, track, value: { not: null } },
      select: { value: true, stage: true },
    });
    forecast = computeForecast(stages, valued);
  }

  const followUps: FollowUp[] = [
    ...oppFollowUps.map((o) => ({
      key: `o-${o.id}`,
      href: `/oportunidades/${o.id}`,
      title: o.title,
      subtitle: o.company?.name ?? null,
      date: o.nextFollowUpAt!,
      kind: "opportunity" as const,
    })),
    ...contactFollowUps.map((c) => ({
      key: `c-${c.id}`,
      href: `/contactos/${c.id}`,
      title: c.name,
      subtitle: [c.role, c.company?.name].filter(Boolean).join(" · ") || null,
      date: c.nextFollowUpAt!,
      kind: "contact" as const,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const now = new Date();
  const overdueCount = followUps.filter((fu) => fu.date < now).length;

  return {
    countByStage,
    totalOpportunities,
    followUps,
    overdueCount,
    noContactOpps,
    contactCount,
    forecast,
    onboarding,
  };
}
