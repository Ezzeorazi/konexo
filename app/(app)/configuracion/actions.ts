"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { setSettings } from "@/lib/settings";
import { generateAiText } from "@/lib/ai";
import { TRACKS, isTrack, type Track } from "@/lib/tracks";
import { CVVersionSchema, firstZodError } from "@/lib/validation";
import {
  ACTIVE_TRACK_COOKIE,
  ENABLED_TRACKS_KEY,
  BUSINESS_NAME_KEY,
} from "@/lib/active-track";

export type CVVersionInput = {
  label: string;
  fileName?: string;
  content?: string;
  notes?: string;
};

export async function createCVVersion(input: CVVersionInput) {
  const parsed = CVVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  const cv = await prisma.cVVersion.create({
    data: {
      userId,
      label: input.label.trim(),
      fileName: input.fileName?.trim() || null,
      content: input.content?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath("/configuracion");
  return { ok: true as const, id: cv.id };
}

export async function updateCVVersion(id: string, input: CVVersionInput) {
  const parsed = CVVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  const { count } = await prisma.cVVersion.updateMany({
    where: { id, userId },
    data: {
      label: input.label.trim(),
      fileName: input.fileName?.trim() || null,
      content: input.content?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré esa versión de CV." };
  }
  revalidatePath("/configuracion");
  return { ok: true as const, id };
}

export async function deleteCVVersion(id: string) {
  const userId = await currentUserId();
  await prisma.cVVersion.deleteMany({ where: { id, userId } });
  revalidatePath("/configuracion");
  return { ok: true as const };
}

export async function testAiConnection() {
  return generateAiText({
    surface: "test_connection",
    system:
      "Sos un asistente de prueba. Respondé exactamente lo que se te pide, sin agregar nada.",
    prompt: 'Respondé únicamente con la palabra "listo".',
  });
}

export async function setActiveTrack(track: Track) {
  if (!isTrack(track)) {
    return { ok: false as const, error: "Track inválido." };
  }
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TRACK_COOKIE, track, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function saveEnabledTracks(tracks: Track[], businessName?: string) {
  const enabled = TRACKS.filter((t) => tracks.includes(t));
  if (enabled.length === 0) {
    return {
      ok: false as const,
      error: "Tenés que dejar al menos un modo activo.",
    };
  }
  const entries = [{ key: ENABLED_TRACKS_KEY, value: enabled.join(",") }];
  // Nombre personalizado del modo "Tu negocio" (opcional, máx 60). Vacío = default.
  if (businessName !== undefined) {
    entries.push({ key: BUSINESS_NAME_KEY, value: businessName.trim().slice(0, 60) });
  }
  await setSettings(entries);
  // Si el track activo quedó deshabilitado, lo movemos al primero disponible.
  const cookieStore = await cookies();
  const current = cookieStore.get(ACTIVE_TRACK_COOKIE)?.value;
  if (!isTrack(current) || !enabled.includes(current)) {
    cookieStore.set(ACTIVE_TRACK_COOKIE, enabled[0], {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function saveSettings(entries: { key: string; value: string }[]) {
  await setSettings(entries);
  revalidatePath("/configuracion");
  return { ok: true as const };
}

// Guardado de la config de IA con manejo especial de la API key (Tarea 2). La
// key nunca viaja completa al cliente, así que el form no puede reenviarla: si
// el campo va vacío CONSERVAMOS la key existente (no la pisamos). Para quitarla,
// clearApiKey la deja en "" (vuelve al default compartido del servidor).
export async function saveAiSettings(input: {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  clearApiKey?: boolean;
}) {
  const entries: { key: string; value: string }[] = [
    { key: "aiProvider", value: input.provider },
    { key: "aiModel", value: input.model },
    { key: "aiBaseUrl", value: input.baseUrl },
  ];
  if (input.clearApiKey) {
    entries.push({ key: "aiApiKey", value: "" });
  } else if (input.apiKey.trim()) {
    // Solo si el usuario tipeó una key nueva la reemplazamos (cifrada en setSettings).
    entries.push({ key: "aiApiKey", value: input.apiKey.trim() });
  }
  // Campo vacío y sin clear: no tocamos aiApiKey (se conserva la guardada).
  await setSettings(entries);
  revalidatePath("/configuracion");
  return { ok: true as const };
}
