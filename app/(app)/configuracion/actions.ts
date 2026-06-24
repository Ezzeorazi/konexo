"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateAiText } from "@/lib/ai";
import { TRACKS, isTrack, type Track } from "@/lib/tracks";
import { ACTIVE_TRACK_COOKIE, ENABLED_TRACKS_KEY } from "@/lib/active-track";

export type CVVersionInput = {
  label: string;
  fileName?: string;
  content?: string;
  notes?: string;
};

export async function createCVVersion(input: CVVersionInput) {
  if (!input.label?.trim()) {
    return { ok: false as const, error: "La etiqueta es obligatoria." };
  }
  const cv = await prisma.cVVersion.create({
    data: {
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
  if (!input.label?.trim()) {
    return { ok: false as const, error: "La etiqueta es obligatoria." };
  }
  await prisma.cVVersion.update({
    where: { id },
    data: {
      label: input.label.trim(),
      fileName: input.fileName?.trim() || null,
      content: input.content?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath("/configuracion");
  return { ok: true as const, id };
}

export async function deleteCVVersion(id: string) {
  await prisma.cVVersion.delete({ where: { id } });
  revalidatePath("/configuracion");
  return { ok: true as const };
}

export async function testAiConnection() {
  return generateAiText({
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

export async function saveEnabledTracks(tracks: Track[]) {
  const enabled = TRACKS.filter((t) => tracks.includes(t));
  if (enabled.length === 0) {
    return {
      ok: false as const,
      error: "Tenés que dejar al menos un modo activo.",
    };
  }
  await prisma.setting.upsert({
    where: { key: ENABLED_TRACKS_KEY },
    update: { value: enabled.join(",") },
    create: { key: ENABLED_TRACKS_KEY, value: enabled.join(",") },
  });
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
  for (const { key, value } of entries) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  revalidatePath("/configuracion");
  return { ok: true as const };
}
