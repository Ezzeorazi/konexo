import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getTrackStages } from "@/lib/stages";
import type { StageDef } from "@/lib/tracks";
import {
  fortuneDayKey,
  pickDailyFortune,
  pickFortune,
  type Fortune,
  type FortuneOpp,
} from "@/lib/fortunes";

// Capa server de las Galletas de la Victoria: arma el contexto (FortuneOpp) de
// cada oportunidad de empleo desde Prisma. La decisión de qué galleta toca vive
// en lib/fortunes.ts (pura); acá solo se cargan datos.

/** Cookie del modo: "off" = galletas escondidas. Ausente = encendidas. */
export const FORTUNE_COOKIE = "konexo-galletas";

export async function fortunesEnabled(): Promise<boolean> {
  const store = await cookies();
  return store.get(FORTUNE_COOKIE)?.value !== "off";
}

const oppSelect = {
  id: true,
  title: true,
  stage: true,
  createdAt: true,
  appliedAt: true,
  nextFollowUpAt: true,
  jobDescription: true,
  cvVersionId: true,
  fitVerdict: true,
  company: { select: { name: true, _count: { select: { contacts: true } } } },
  touchpoints: {
    where: { contactId: { not: null } },
    select: { id: true },
    take: 1,
  },
  cookieVictories: { select: { fortuneKey: true } },
} as const;

type OppRow = {
  id: string;
  title: string;
  stage: string;
  createdAt: Date;
  appliedAt: Date | null;
  nextFollowUpAt: Date | null;
  jobDescription: string | null;
  cvVersionId: string | null;
  fitVerdict: string | null;
  company: { name: string; _count: { contacts: number } } | null;
  touchpoints: { id: string }[];
  cookieVictories: { fortuneKey: string }[];
};

function toFortuneOpp(row: OppRow, stages: StageDef[]): FortuneOpp {
  const stageType = stages.find((s) => s.key === row.stage)?.type ?? "open";
  return {
    id: row.id,
    title: row.title,
    companyName: row.company?.name ?? null,
    stage: row.stage,
    stageType,
    createdAt: row.createdAt,
    appliedAt: row.appliedAt,
    nextFollowUpAt: row.nextFollowUpAt,
    hasDescription: Boolean(row.jobDescription?.trim()),
    hasCv: Boolean(row.cvVersionId),
    hasContact:
      (row.company?._count.contacts ?? 0) > 0 || row.touchpoints.length > 0,
    fitVerdict: row.fitVerdict,
    won: row.cookieVictories.map((v) => v.fortuneKey),
  };
}

/** Contexto de UNA oportunidad de empleo del usuario (null si no es suya o no es de empleo). */
export async function loadFortuneOpp(
  userId: string,
  opportunityId: string
): Promise<FortuneOpp | null> {
  const [row, stages] = await Promise.all([
    prisma.opportunity.findFirst({
      where: { id: opportunityId, userId, track: "jobs" },
      select: oppSelect,
    }),
    getTrackStages("jobs"),
  ]);
  return row ? toFortuneOpp(row, stages) : null;
}

/** La galleta que toca ahora en una oportunidad. */
export async function getOppFortune(
  userId: string,
  opportunityId: string
): Promise<Fortune | null> {
  const opp = await loadFortuneOpp(userId, opportunityId);
  return opp ? pickFortune(opp, new Date()) : null;
}

export type DailyCookie = {
  dayKey: string;
  /** Ya cumplió la galleta del día de hoy. */
  wonToday: boolean;
  fortune: Fortune | null;
  /** No hay ninguna oportunidad de empleo cargada todavía. */
  empty: boolean;
};

/** Galleta del día: la más urgente del pipeline de empleo del usuario. */
export async function getDailyCookie(userId: string): Promise<DailyCookie> {
  const now = new Date();
  const dayKey = fortuneDayKey(now);
  const [rows, stages, wonToday] = await Promise.all([
    prisma.opportunity.findMany({
      where: { userId, track: "jobs" },
      select: oppSelect,
    }),
    getTrackStages("jobs"),
    prisma.cookieVictory.count({ where: { userId, daily: true, dayKey } }),
  ]);
  const opps = rows.map((r) => toFortuneOpp(r, stages));
  return {
    dayKey,
    wonToday: wonToday > 0,
    fortune: pickDailyFortune(opps, now, dayKey),
    empty: rows.length === 0,
  };
}
