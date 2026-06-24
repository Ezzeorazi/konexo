"use server";

import { generateAiChat, type ChatMessage } from "@/lib/ai";
import { gatherPipeline, buildChatSystemPrompt } from "./pipeline";

export async function sendChatMessage(messages: ChatMessage[]) {
  if (!messages.length) {
    return { ok: false as const, error: "No hay mensaje para enviar." };
  }
  const data = await gatherPipeline();
  const system = buildChatSystemPrompt(data);
  return generateAiChat({
    system,
    // Limitamos el historial para no exceder el contexto del modelo.
    messages: messages.slice(-20),
  });
}
