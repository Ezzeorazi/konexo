import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Acceso a la tabla Setting siempre scopeado al usuario actual. Las settings
// (proveedor de IA, perfil de negocio, tracks habilitados) son por-usuario:
// la unique es @@unique([userId, key]).
//
// Cifrado transparente (Tarea 2): las keys marcadas como sensibles se guardan
// cifradas at-rest (AES-256-GCM, ver lib/crypto.ts) y se descifran al leer. El
// resto de la app trabaja siempre con valores en claro, sin enterarse.

/** Keys cuyo valor es un secreto y se cifra at-rest. */
const SENSITIVE_SETTING_KEYS = new Set(["aiApiKey"]);

function isSensitive(key: string): boolean {
  return SENSITIVE_SETTING_KEYS.has(key);
}

/** Lee varias keys del usuario actual como mapa key -> value (descifrado). */
export async function getSettingsMap(keys: string[]): Promise<Map<string, string>> {
  const userId = await currentUserId();
  const rows = await prisma.setting.findMany({
    where: { userId, key: { in: keys } },
    select: { key: true, value: true },
  });
  return new Map(
    rows.map((r) => [r.key, isSensitive(r.key) ? decryptSecret(r.value) : r.value])
  );
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
    const stored = isSensitive(key) ? encryptSecret(value) : value;
    await prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value: stored },
      create: { userId, key, value: stored },
    });
  }
}
