import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { Prisma } from "@/lib/generated/prisma/client";
import { loadFortuneOpp } from "@/lib/fortune-data";
import {
  DAILY_BONUS,
  fortuneDayKey,
  isFortuneKey,
  pickFortune,
  type Fortune,
} from "@/lib/fortunes";

export type VictoryResult =
  | {
      ok: true;
      /** false = ya estaba ganada (no se re-otorgan créditos). */
      awarded: boolean;
      credits: number;
      totalCredits: number;
      /** La galleta que sigue en esa oportunidad (cada victoria desbloquea otra). */
      next: Fortune | null;
    }
  | { ok: false; error: string };

/**
 * Cumple una galleta. El server NO confía en lo que manda el cliente: vuelve a
 * calcular qué galleta toca en esa oportunidad y solo acepta la que corresponde
 * ahora (no se pueden farmear claves arbitrarias). Idempotente por el unique
 * (opportunityId, fortuneKey): dos clics concurrentes otorgan créditos una vez.
 */
export async function claimVictory(
  userId: string,
  opportunityId: string,
  fortuneKey: string,
  daily: boolean
): Promise<VictoryResult> {
  if (!isFortuneKey(fortuneKey)) {
    return { ok: false, error: "Galleta desconocida." };
  }
  const opp = await loadFortuneOpp(userId, opportunityId);
  if (!opp) return { ok: false, error: "Oportunidad no encontrada." };

  const now = new Date();
  const dayKey = fortuneDayKey(now);
  const current = pickFortune(opp, now);

  if (opp.won.includes(fortuneKey)) {
    return {
      ok: true,
      awarded: false,
      credits: 0,
      totalCredits: await totalCredits(userId),
      next: current,
    };
  }
  if (current?.key !== fortuneKey) {
    return {
      ok: false,
      error: "Esta galleta ya no aplica: recargá para ver la que toca ahora.",
    };
  }

  const dailyAlready =
    daily &&
    (await prisma.cookieVictory.count({
      where: { userId, daily: true, dayKey },
    })) > 0;
  const isDaily = daily && !dailyAlready;
  const credits = current.credits + (isDaily ? DAILY_BONUS : 0);

  try {
    await prisma.$transaction([
      prisma.cookieVictory.create({
        data: {
          userId,
          opportunityId,
          fortuneKey,
          credits,
          daily: isDaily,
          dayKey,
        },
      }),
      prisma.userProgress.upsert({
        where: { userId },
        update: { credits: { increment: credits } },
        create: { userId, credits },
      }),
    ]);
  } catch (e) {
    // Carrera: otro clic ganó la misma galleta primero. Sin créditos dobles.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        ok: true,
        awarded: false,
        credits: 0,
        totalCredits: await totalCredits(userId),
        next: pickFortune({ ...opp, won: [...opp.won, fortuneKey] }, now),
      };
    }
    throw e;
  }

  await track(userId, "cookie_victory", {
    fortune: fortuneKey,
    credits,
    daily: isDaily,
  });

  return {
    ok: true,
    awarded: true,
    credits,
    totalCredits: await totalCredits(userId),
    next: pickFortune({ ...opp, won: [...opp.won, fortuneKey] }, now),
  };
}

async function totalCredits(userId: string): Promise<number> {
  const row = await prisma.userProgress.findUnique({
    where: { userId },
    select: { credits: true },
  });
  return row?.credits ?? 0;
}
