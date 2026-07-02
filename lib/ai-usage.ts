import { prisma } from "@/lib/prisma";

// Rate limiting de IA por usuario (auditoría / Tarea 3).
//
// La app trae IA lista para todos usando la key del dueño (Groq). Sin límite,
// un usuario podría quemar toda la cuota compartida. Acá contamos las llamadas
// por usuario y día (ventana UTC) y cortamos al llegar al tope.
//
// SOLO aplica al proveedor default (key compartida). Si el usuario configuró su
// propia API key en Configuración, no pasa por acá: uso ilimitado (paga él).
//
// Sin Redis en el stack: usamos una tabla de contadores en Postgres (AiUsage).
// El incremento es atómico (UPDATE ... count + 1), así que es correcto bajo
// concurrencia; contamos primero y rechazamos si el resultado supera el tope,
// de modo que se permiten exactamente LIMIT llamadas por día.

/** Tope diario de llamadas con la key compartida. Override por env. */
export const AI_DAILY_LIMIT = Math.max(
  1,
  Number(process.env.AI_DAILY_LIMIT) || 30
);

/** Mensaje para el front cuando se agota la cuota compartida. */
export const AI_LIMIT_ERROR =
  "Límite diario alcanzado. Configurá tu propia API key en Configuración para uso ilimitado.";

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

export type QuotaResult =
  | { ok: true; used: number; remaining: number }
  | { ok: false; error: string };

/**
 * Consume una unidad de cuota diaria del usuario. Devuelve ok:false con mensaje
 * si ya está en el tope. Incrementa de forma atómica.
 */
export async function consumeAiQuota(userId: string): Promise<QuotaResult> {
  const day = utcDay();
  const row = await prisma.aiUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (row.count > AI_DAILY_LIMIT) {
    return { ok: false, error: AI_LIMIT_ERROR };
  }
  return { ok: true, used: row.count, remaining: AI_DAILY_LIMIT - row.count };
}
