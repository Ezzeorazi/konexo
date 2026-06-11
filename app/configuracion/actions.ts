"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CVVersionInput = {
  label: string;
  fileName?: string;
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
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath("/configuracion");
  return { ok: true as const, id: cv.id };
}

export async function deleteCVVersion(id: string) {
  await prisma.cVVersion.delete({ where: { id } });
  revalidatePath("/configuracion");
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
