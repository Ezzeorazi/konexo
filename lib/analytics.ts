import { PostHog } from "posthog-node";

// Captura de eventos de producto del lado del servidor. Es la vía fiable para
// la métrica de activación y la retención: no la bloquean adblockers ni depende
// del browser. Degradación elegante: sin POSTHOG_API_KEY no emite nada.
//
// Ver [[fundeable-pivot]]: el evento estrella es "activated" (1ª oportunidad +
// 1 follow-up); con eso PostHog arma activación y retención W1/W4.

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) {
    client = null;
    return null;
  }
  client = new PostHog(key, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Serverless: mandamos enseguida en lugar de batchear en memoria.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/** Emite un evento ligado al usuario. distinctId = userId de Clerk. No-op sin key. */
export async function track(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    c.capture({ distinctId, event, properties });
    await c.flush();
  } catch {
    // La analítica nunca debe romper un flujo de producto.
  }
}
