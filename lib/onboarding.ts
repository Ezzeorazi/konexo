import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// Lógica central de las "Misiones/Batallas" de onboarding. Espejo de
// lib/activation.ts: una capa fina sobre Prisma que mantiene el progreso por
// usuario y emite eventos a PostHog. El front nunca decide créditos ni qué
// misión existe: solo dispara un slug (ver app/(app)/onboarding/actions.ts y el
// hook useOnboarding). Acá vive la única fuente de verdad.

// Catálogo de misiones. El slug es estable (se persiste implícito en la columna)
// y la recompensa en créditos se otorga UNA sola vez, al completar.
export const MISSIONS = {
  firstSighting: {
    field: "firstSightingAt",
    title: "Primer Avistamiento",
    description: "Cargá tu primera empresa/cuenta.",
    credits: 10,
  },
  establishContact: {
    field: "establishContactAt",
    title: "Establecer Contacto",
    description: "Cargá tu primer contacto.",
    credits: 10,
  },
  launchAttack: {
    field: "launchAttackAt",
    title: "Lanzar Ataque",
    description: "Registrá tu primer touchpoint/petición.",
    credits: 15,
  },
  setRadar: {
    field: "setRadarAt",
    title: "Fijar Radar",
    description: "Configurá tu primer follow-up.",
    credits: 15,
  },
} as const;

export type MissionSlug = keyof typeof MISSIONS;

export const MISSION_SLUGS = Object.keys(MISSIONS) as MissionSlug[];

export function isMissionSlug(value: string): value is MissionSlug {
  return value in MISSIONS;
}

// Forma que consume el front: cada misión con su estado y la fecha en que se
// completó, más el total de créditos.
export type OnboardingState = {
  credits: number;
  missions: {
    slug: MissionSlug;
    title: string;
    description: string;
    credits: number;
    completed: boolean;
    completedAt: string | null;
  }[];
};

/** Lee (o crea vacío) el progreso del usuario y lo arma en la forma del front. */
export async function getProgress(userId: string): Promise<OnboardingState> {
  const row = await prisma.userProgress.findUnique({ where: { userId } });
  return {
    credits: row?.credits ?? 0,
    missions: MISSION_SLUGS.map((slug) => {
      const completedAt = row?.[MISSIONS[slug].field] ?? null;
      return {
        slug,
        title: MISSIONS[slug].title,
        description: MISSIONS[slug].description,
        credits: MISSIONS[slug].credits,
        completed: completedAt != null,
        completedAt: completedAt ? completedAt.toISOString() : null,
      };
    }),
  };
}

/**
 * Marca una misión como completada de forma idempotente: si ya estaba hecha, no
 * hace nada (ni re-otorga créditos). Devuelve el estado actualizado y si esta
 * llamada fue la que la completó (`awarded`), para que el front celebre solo la
 * primera vez. Seguro ante carreras: el WHERE filtra por field null.
 */
export async function completeMission(
  userId: string,
  slug: MissionSlug
): Promise<{ awarded: boolean; state: OnboardingState }> {
  const { field, credits } = MISSIONS[slug];
  const now = new Date();

  // Garantiza la fila sin pisar progreso existente.
  await prisma.userProgress.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Solo actualiza si la misión seguía pendiente (field IS NULL). updateMany
  // con el filtro hace la operación atómica: dos llamadas concurrentes no
  // otorgan créditos dos veces.
  const { count } = await prisma.userProgress.updateMany({
    where: { userId, [field]: null },
    data: { [field]: now, credits: { increment: credits } },
  });

  const awarded = count > 0;
  if (awarded) {
    await track(userId, "mission_completed", { mission: slug, credits });
  }

  return { awarded, state: await getProgress(userId) };
}
