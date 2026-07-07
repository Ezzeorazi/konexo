"use server";

import { generateAiChat, type ChatMessage } from "@/lib/ai";
import { clampText } from "@/lib/prompt-safety";
import { gatherPipeline, buildChatSystemPrompt } from "./pipeline";

// Tope de caracteres por mensaje del chat (Tarea 4): evita que un paste enorme
// (ej. un mail largo) infle el contexto o se use para diluir las instrucciones.
const MAX_CHARS_PER_MESSAGE = 8000;

export async function sendChatMessage(messages: ChatMessage[]) {
  if (!messages.length) {
    return { ok: false as const, error: "No hay mensaje para enviar." };
  }
  const data = await gatherPipeline();
  const system = buildChatSystemPrompt(data);
  return generateAiChat({
    system,
    surface: "chat",
    // Limitamos el historial para no exceder el contexto del modelo, y truncamos
    // cada mensaje a un largo máximo.
    messages: messages.slice(-20).map((m) => ({
      role: m.role,
      content: clampText(m.content, MAX_CHARS_PER_MESSAGE),
    })),
  });
}
