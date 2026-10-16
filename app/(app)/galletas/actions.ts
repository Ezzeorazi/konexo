"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/lib/auth";
import { claimVictory, type VictoryResult } from "@/lib/fortune-victory";
import { FORTUNE_COOKIE } from "@/lib/fortune-data";

// Endpoints de las Galletas de la Victoria. Como toda Server Action son
// alcanzables por POST directo: validamos tipos acá y scopeamos SIEMPRE con
// currentUserId(); claimVictory re-calcula qué galleta toca (no confía en el
// cliente).

export async function claimVictoryAction(
  opportunityId: string,
  fortuneKey: string,
  daily: boolean
): Promise<VictoryResult> {
  if (typeof opportunityId !== "string" || typeof fortuneKey !== "string") {
    return { ok: false, error: "Datos inválidos." };
  }
  const userId = await currentUserId();
  const res = await claimVictory(userId, opportunityId, fortuneKey, daily === true);
  if (res.ok && res.awarded) {
    revalidatePath("/dashboard");
    revalidatePath(`/oportunidades/${opportunityId}`);
  }
  return res;
}

/** Prende/apaga el modo galletas (cookie por dispositivo, como el modo activo). */
export async function setFortunesEnabled(enabled: boolean) {
  const store = await cookies();
  store.set(FORTUNE_COOKIE, enabled ? "on" : "off", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
