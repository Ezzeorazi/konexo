import { getSettingsMap } from "@/lib/settings";
import { currentUserId } from "@/lib/auth";
import { consumeAiQuota } from "@/lib/ai-usage";
import { track } from "@/lib/analytics";

/**
 * Superficie de IA que originó la llamada. Se emite como propiedad del evento
 * `ai_call` para poder medir uso superficie por superficie (hoy `AiUsage` solo
 * guarda un contador agregado por usuario/día, sin discriminar por superficie).
 * Instrumentación previa a la consolidación 6→3 del asistente.
 */
export type AiSurface =
  | "chat"
  | "agents"
  | "cv"
  | "catchup"
  | "daily_review"
  | "test_connection";

export const DEFAULT_MODELS: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
  ollama: "llama3.2",
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
};

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";

export type AiConfig = {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  /** true si la config resolvió a la key compartida del dueño (no la del usuario). */
  usingServerKey: boolean;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Default del lado del servidor: la app viene con IA lista para todos usando la
// key del dueño (env). Cada usuario puede overridearla en Configuración con su
// propio proveedor/key; si no toca nada, usa este default compartido.
const SERVER_DEFAULT_PROVIDER = process.env.AI_DEFAULT_PROVIDER || "groq";
const SERVER_DEFAULT_API_KEY = process.env.GROQ_API_KEY || process.env.AI_DEFAULT_API_KEY || "";
const SERVER_DEFAULT_MODEL = process.env.AI_DEFAULT_MODEL || "";

/** ¿Hay IA lista para usar sin que el usuario configure nada? */
export function hasServerDefaultAi(): boolean {
  return Boolean(SERVER_DEFAULT_API_KEY);
}

export async function getAiConfig(): Promise<AiConfig> {
  const map = await getSettingsMap([
    "aiProvider",
    "aiApiKey",
    "aiModel",
    "aiBaseUrl",
  ]);
  // Provider: el del usuario si lo eligió, si no el default del servidor.
  const provider = map.get("aiProvider") || SERVER_DEFAULT_PROVIDER;

  // Key: la del usuario si la cargó. Si no cargó ninguna y el provider quedó en
  // el default del servidor, usamos la key del dueño (Groq) para que la IA
  // funcione out-of-the-box para todos.
  let apiKey = map.get("aiApiKey") ?? "";
  let usingServerKey = false;
  if (!apiKey && provider === SERVER_DEFAULT_PROVIDER && SERVER_DEFAULT_API_KEY) {
    apiKey = SERVER_DEFAULT_API_KEY;
    usingServerKey = true;
  }

  return {
    provider,
    apiKey,
    usingServerKey,
    model:
      map.get("aiModel") ||
      (provider === SERVER_DEFAULT_PROVIDER ? SERVER_DEFAULT_MODEL : "") ||
      DEFAULT_MODELS[provider] ||
      "",
    baseUrl: map.get("aiBaseUrl") || DEFAULT_OLLAMA_URL,
  };
}

export type AiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function generateAiText({
  system,
  prompt,
  surface,
}: {
  system: string;
  prompt: string;
  surface: AiSurface;
}): Promise<AiResult> {
  return generateAiChat({
    system,
    surface,
    messages: [{ role: "user", content: prompt }],
  });
}

export async function generateAiChat({
  system,
  messages,
  surface,
}: {
  system: string;
  messages: ChatMessage[];
  surface: AiSurface;
}): Promise<AiResult> {
  const config = await getAiConfig();
  const userId = await currentUserId();

  // Instrumentación (analytics): una llamada real al proveedor, etiquetada por
  // superficie. Fire-and-forget a propósito: NO la esperamos para no sumar el
  // round-trip a PostHog a la latencia de cada respuesta de IA; el flush corre
  // holgado durante la llamada al proveedor (que tarda segundos). track() es
  // no-op sin POSTHOG_API_KEY y traga sus propios errores, así que nunca puede
  // tumbar el flujo ni dejar una promesa rechazada suelta.
  void track(userId, "ai_call", {
    surface,
    provider: config.provider,
    usingServerKey: config.usingServerKey,
  });

  // Rate limit (Tarea 3): solo cuando se usa la key compartida del dueño. Con la
  // key propia del usuario no hay tope. Se cuenta cada llamada al LLM (el equipo
  // de agentes hace varias por corrida, lo cual es uso real de la cuota).
  if (config.usingServerKey) {
    const quota = await consumeAiQuota(userId);
    if (!quota.ok) {
      return { ok: false, error: quota.error };
    }
  }

  try {
    switch (config.provider) {
      case "groq":
        return await callOpenAiCompatible(
          config,
          system,
          messages,
          "Groq",
          "https://api.groq.com/openai/v1/chat/completions"
        );
      case "ollama":
        return await callOllama(config, system, messages);
      case "anthropic":
        return await callAnthropic(config, system, messages);
      case "openai":
        return await callOpenAiCompatible(
          config,
          system,
          messages,
          "OpenAI",
          "https://api.openai.com/v1/chat/completions"
        );
      case "google":
        return await callGoogle(config, system, messages);
      default:
        return {
          ok: false,
          error: `Proveedor de IA desconocido: ${config.provider}.`,
        };
    }
  } catch (err) {
    if (config.provider === "ollama" && err instanceof TypeError) {
      return {
        ok: false,
        error: `No pude conectar con Ollama en ${config.baseUrl}. ¿Está corriendo? Abrí la app de Ollama o ejecutá \`ollama serve\` en una terminal.`,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Error al llamar a la IA: ${message}` };
  }
}

async function callOllama(
  config: AiConfig,
  system: string,
  messages: ChatMessage[]
): Promise<AiResult> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (res.status === 404) {
    return {
      ok: false,
      error: `Ollama no encontró el modelo "${config.model}". Descargalo con \`ollama pull ${config.model}\` o cambiá el modelo en Configuración.`,
    };
  }
  if (!res.ok) {
    return { ok: false, error: `Ollama respondió ${res.status}: ${await res.text()}` };
  }
  const data = (await res.json()) as { message?: { content?: string } };
  const text = data.message?.content?.trim();
  if (!text) return { ok: false, error: "Ollama devolvió una respuesta vacía." };
  return { ok: true, text };
}

async function callAnthropic(
  config: AiConfig,
  system: string,
  messages: ChatMessage[]
): Promise<AiResult> {
  if (!config.apiKey) return missingKeyError("Anthropic");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    return { ok: false, error: `Anthropic respondió ${res.status}: ${await res.text()}` };
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  if (!text) return { ok: false, error: "Anthropic devolvió una respuesta vacía." };
  return { ok: true, text };
}

async function callOpenAiCompatible(
  config: AiConfig,
  system: string,
  messages: ChatMessage[],
  providerName: string,
  endpoint: string
): Promise<AiResult> {
  if (!config.apiKey) return missingKeyError(providerName);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: `${providerName} respondió ${res.status}: ${await res.text()}`,
    };
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { ok: false, error: `${providerName} devolvió una respuesta vacía.` };
  }
  return { ok: true, text };
}

async function callGoogle(
  config: AiConfig,
  system: string,
  messages: ChatMessage[]
): Promise<AiResult> {
  if (!config.apiKey) return missingKeyError("Google");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );
  if (!res.ok) {
    return { ok: false, error: `Google respondió ${res.status}: ${await res.text()}` };
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) return { ok: false, error: "Google devolvió una respuesta vacía." };
  return { ok: true, text };
}

function missingKeyError(provider: string): AiResult {
  return {
    ok: false,
    error: `Falta la API key de ${provider}. Cargala en Configuración (la de Groq es gratis en console.groq.com).`,
  };
}
