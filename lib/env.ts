// Validación de variables de entorno críticas (auditoría H1 / Tarea 1).
//
// Objetivo: FALLAR CERRADO. Si en producción falta una env var sin la cual la
// app no puede operar de forma segura (auth, base de datos, cifrado de secretos),
// preferimos abortar el build/arranque a servir la app mal configurada.
//
// Se invoca desde dos lados:
//  - next.config.ts  → corre en build. `next build` con NODE_ENV=production sin
//    las keys falla el build (no llega a desplegarse).
//  - instrumentation.ts → corre una vez al iniciar cada instancia del server.
//    Segunda red por si el build se hizo en otro entorno.
//
// En dev local (NODE_ENV !== production) NO exigimos nada: la app degrada a
// usuario-dev y settings en texto plano (ver lib/auth.ts, lib/settings.ts).

const IS_PRODUCTION = process.env.NODE_ENV === "production";

type EnvRule = {
  name: string;
  reason: string;
};

// Requeridas SIEMPRE en producción.
const REQUIRED_IN_PRODUCTION: EnvRule[] = [
  {
    name: "CLERK_SECRET_KEY",
    reason: "sin auth, la app quedaría abierta o mezclaría datos de usuarios.",
  },
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    reason: "el cliente de Clerk no puede inicializarse sin la publishable key.",
  },
  {
    name: "DATABASE_URL",
    reason: "sin base de datos no hay a dónde leer/escribir los datos del tenant.",
  },
];

let alreadyValidated = false;

/**
 * Lanza si falta alguna env var crítica en producción. Idempotente: solo valida
 * una vez por proceso. En dev es un no-op.
 */
export function assertCriticalEnv(): void {
  if (alreadyValidated) return;
  alreadyValidated = true;

  if (!IS_PRODUCTION) return;

  const missing = REQUIRED_IN_PRODUCTION.filter(
    (rule) => !process.env[rule.name]?.trim()
  );

  if (missing.length > 0) {
    const detail = missing
      .map((rule) => `  - ${rule.name}: ${rule.reason}`)
      .join("\n");
    throw new Error(
      `[env] Faltan variables de entorno críticas en producción. Se aborta para ` +
        `no correr mal configurado (fail-closed):\n${detail}\n` +
        `Configuralas en Vercel → Project Settings → Environment Variables.`
    );
  }
}
