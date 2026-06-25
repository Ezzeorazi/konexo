import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";

// Acceso a la tabla Setting siempre scopeado al usuario actual. Las settings
// (proveedor de IA, perfil de negocio, tracks habilitados) son por-usuario:
// la unique es @@unique([userId, key]).

/** Lee varias keys del usuario actual como mapa key -> value. */
export async function getSettingsMap(keys: string[]): Promise<Map<string, string>> {
  const userId = await currentUserId();
  const rows = await prisma.setting.findMany({
    where: { userId, key: { in: keys } },
    select: { key: true, value: true },
  });
  return new Map(rows.map((r) => [r.key, r.value]));
}

/** Lee una sola key del usuario actual. */
export async function getSetting(key: string): Promise<string | undefined> {
  return (await getSettingsMap([key])).get(key);
}

/** Upsert de una o varias settings del usuario actual. */
export async function setSettings(
  entries: { key: string; value: string }[]
): Promise<void> {
  const userId = await currentUserId();
  for (const { key, value } of entries) {
    await prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value },
    });
  }
}
