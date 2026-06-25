import { prisma } from "@/lib/prisma";
import { getSetting, setSettings } from "@/lib/settings";
import { track } from "@/lib/analytics";

// Métrica estrella de activación (ver [[fundeable-pivot]]):
// un usuario está "activado" cuando creó su 1ª oportunidad Y completó 1 follow-up
// (un touchpoint). Se marca una sola vez con la setting `activatedAt` y se emite
// el evento `activated` a PostHog para alimentar el funnel y la retención.

export async function maybeTrackActivation(userId: string): Promise<void> {
  // Ya activado: nada que hacer (corta sin tocar la DB de más).
  if (await getSetting("activatedAt")) return;

  const [opportunities, touchpoints] = await Promise.all([
    prisma.opportunity.count({ where: { userId } }),
    prisma.touchpoint.count({ where: { userId } }),
  ]);

  if (opportunities >= 1 && touchpoints >= 1) {
    await setSettings([{ key: "activatedAt", value: new Date().toISOString() }]);
    await track(userId, "activated", { opportunities, touchpoints });
  }
}
