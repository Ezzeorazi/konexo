"use server";

import { currentUserId } from "@/lib/auth";
import {
  completeMission,
  getProgress,
  isMissionSlug,
  type OnboardingState,
} from "@/lib/onboarding";

// Endpoint seguro de las misiones de onboarding. Las Server Actions son
// públicas (alcanzables por POST directo), así que validamos el slug contra el
// catálogo y scopeamos SIEMPRE con currentUserId(): el caller no elige a quién
// le sumamos créditos. Devuelven el discriminado { ok } del resto de la app.

export type OnboardingResult =
  | { ok: true; awarded: boolean; state: OnboardingState }
  | { ok: false; error: string };

/** Completa una misión (idempotente). `awarded` indica si fue la 1ª vez. */
export async function completeMissionAction(
  slug: string
): Promise<OnboardingResult> {
  if (!isMissionSlug(slug)) {
    return { ok: false as const, error: "Misión desconocida." };
  }
  const userId = await currentUserId();
  const { awarded, state } = await completeMission(userId, slug);
  return { ok: true as const, awarded, state };
}

/** Consulta el estado actual de misiones y créditos del usuario. */
export async function getOnboardingState(): Promise<OnboardingState> {
  const userId = await currentUserId();
  return getProgress(userId);
}
