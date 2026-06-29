"use client";

import { useCallback, useState, useTransition } from "react";
import {
  completeMissionAction,
  type OnboardingResult,
} from "@/app/(app)/onboarding/actions";
import type { MissionSlug, OnboardingState } from "@/lib/onboarding";

// Hook para disparar misiones desde cualquier parte del front con una línea:
//
//   const { complete } = useOnboarding();
//   await complete("establishContact"); // tras crear un contacto
//
// Llama la Server Action (que valida y scopea por usuario) dentro de una
// transición para no bloquear la UI. Mantiene el último estado devuelto por el
// server, así un panel de progreso se actualiza sin re-fetch manual.
//
// Es idempotente del lado del server: dispararlo de más es inofensivo (no
// re-otorga créditos). `result.awarded` permite celebrar solo la 1ª vez.

export type UseOnboarding = {
  /** Marca una misión como completada. Resuelve con el resultado del server. */
  complete: (slug: MissionSlug) => Promise<OnboardingResult>;
  /** Último estado conocido (créditos + misiones), o null si aún no se consultó. */
  state: OnboardingState | null;
  /** true mientras hay una acción en vuelo. */
  pending: boolean;
};

export function useOnboarding(initialState?: OnboardingState): UseOnboarding {
  const [state, setState] = useState<OnboardingState | null>(
    initialState ?? null
  );
  const [pending, startTransition] = useTransition();

  const complete = useCallback((slug: MissionSlug): Promise<OnboardingResult> => {
    return new Promise<OnboardingResult>((resolve) => {
      startTransition(async () => {
        const result = await completeMissionAction(slug);
        if (result.ok) setState(result.state);
        resolve(result);
      });
    });
  }, []);

  return { complete, state, pending };
}
