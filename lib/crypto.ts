import crypto from "node:crypto";

// Cifrado at-rest de secretos de usuario (auditoría / Tarea 2). Hoy: las API
// keys de IA que el usuario carga en Configuración. Se guardan cifradas en
// Postgres (tabla Setting) para que un dump de la base no exponga las keys.
//
// AES-256-GCM: cifrado autenticado (confidencialidad + integridad). La clave
// (32 bytes) viene de SETTINGS_ENCRYPTION_KEY, aceptada como hex (64 chars) o
// base64. Generá una con:  openssl rand -base64 32
//
// Formato del valor almacenado:  enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
// El prefijo permite distinguir valores cifrados de los plaintext legacy (que se
// leen tal cual y se re-cifran al próximo guardado).

const PREFIX = "enc:v1:";
const IV_BYTES = 12; // recomendado para GCM
const KEY_BYTES = 32; // AES-256

/** Deriva la clave de 32 bytes desde SETTINGS_ENCRYPTION_KEY, o null si no está. */
function getKey(): Buffer | null {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw) return null;

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `SETTINGS_ENCRYPTION_KEY inválida: se esperaban ${KEY_BYTES} bytes ` +
        `(hex de 64 chars o base64 de 32 bytes), se obtuvieron ${key.length}. ` +
        `Generá una con: openssl rand -base64 32`
    );
  }
  return key;
}

/** ¿Este valor ya está cifrado con nuestro formato? */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Cifra un secreto. Si el valor es vacío lo devuelve tal cual (vacío = "sin
 * secreto"). Sin SETTINGS_ENCRYPTION_KEY (solo dev): guarda en texto plano.
 */
export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const key = getKey();
  if (!key) {
    // Solo dev: sin clave configurada guardamos plaintext (env.ts la exige en prod).
    return plain;
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/**
 * Descifra un secreto. Los valores sin prefijo (plaintext legacy) se devuelven
 * tal cual. Lanza si el valor está cifrado pero falta/está mal la clave.
 */
export function decryptSecret(stored: string): string {
  if (!stored) return stored;
  if (!isEncrypted(stored)) return stored; // legacy plaintext

  const key = getKey();
  if (!key) {
    throw new Error(
      "Hay secretos cifrados pero falta SETTINGS_ENCRYPTION_KEY para descifrarlos."
    );
  }
  const [, , ivB64, tagB64, ctB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Valor cifrado con formato inválido.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * Enmascara un secreto para mostrarlo en la UI: primeros 3 y últimos 4 chars,
 * ej. "gsk…x4Kp". Nunca revela el cuerpo de la key.
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "•".repeat(secret.length);
  return `${secret.slice(0, 3)}…${secret.slice(-4)}`;
}
