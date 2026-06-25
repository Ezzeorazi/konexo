"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { isTrack, getStages, type StageType } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";
import { StageSchema, firstZodError } from "@/lib/validation";

function revalidateStages() {
  revalidatePath("/configuracion");
  revalidatePath("/oportunidades");
  revalidatePath("/dashboard");
}

const TYPES: StageType[] = ["open", "won", "lost"];

function cleanType(type: string): StageType {
  return (TYPES as string[]).includes(type) ? (type as StageType) : "open";
}

function cleanProbability(p: unknown): number {
  const n = Math.round(Number(p));
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export type StageInput = {
  label: string;
  type: string;
  probability: number;
};

export async function createStage(track: string, input: StageInput) {
  if (!isTrack(track)) return { ok: false as const, error: "Track inválido." };
  const parsed = StageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }

  const userId = await currentUserId();
  await getTrackStages(track); // asegura el seed antes de agregar
  const last = await prisma.pipelineStage.findFirst({
    where: { userId, track },
    orderBy: { order: "desc" },
  });
  try {
    await prisma.pipelineStage.create({
      data: {
        userId,
        track,
        key: `S_${randomUUID().slice(0, 8)}`,
        label: input.label.trim(),
        order: (last?.order ?? -1) + 1,
        type: cleanType(input.type),
        probability: cleanProbability(input.probability),
      },
    });
  } catch {
    return { ok: false as const, error: "No se pudo crear la etapa." };
  }
  revalidateStages();
  return { ok: true as const };
}

export async function updateStage(id: string, input: StageInput) {
  const parsed = StageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  try {
    const { count } = await prisma.pipelineStage.updateMany({
      where: { id, userId },
      data: {
        label: input.label.trim(),
        type: cleanType(input.type),
        probability: cleanProbability(input.probability),
      },
    });
    if (count === 0)
      return { ok: false as const, error: "No existe la etapa." };
  } catch {
    return { ok: false as const, error: "No se pudo guardar la etapa." };
  }
  revalidateStages();
  return { ok: true as const };
}

export async function deleteStage(id: string) {
  const userId = await currentUserId();
  const stage = await prisma.pipelineStage.findFirst({ where: { id, userId } });
  if (!stage) return { ok: false as const, error: "No existe la etapa." };

  const count = await prisma.pipelineStage.count({
    where: { userId, track: stage.track },
  });
  if (count <= 2)
    return {
      ok: false as const,
      error: "Un embudo necesita al menos 2 etapas.",
    };

  const used = await prisma.opportunity.count({
    where: { userId, track: stage.track, stage: stage.key },
  });
  if (used > 0)
    return {
      ok: false as const,
      error: `Hay ${used} ${used === 1 ? "card" : "cards"} en esta etapa. Movelas antes de borrarla.`,
    };

  try {
    await prisma.pipelineStage.deleteMany({ where: { id, userId } });
  } catch {
    return { ok: false as const, error: "No se pudo borrar la etapa." };
  }
  revalidateStages();
  return { ok: true as const };
}

export async function moveStage(id: string, direction: "up" | "down") {
  const userId = await currentUserId();
  const stage = await prisma.pipelineStage.findFirst({ where: { id, userId } });
  if (!stage) return { ok: false as const, error: "No existe la etapa." };

  const neighbor = await prisma.pipelineStage.findFirst({
    where: {
      userId,
      track: stage.track,
      order:
        direction === "up"
          ? { lt: stage.order }
          : { gt: stage.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return { ok: true as const }; // ya está en el borde

  try {
    await prisma.$transaction([
      prisma.pipelineStage.updateMany({
        where: { id: stage.id, userId },
        data: { order: neighbor.order },
      }),
      prisma.pipelineStage.updateMany({
        where: { id: neighbor.id, userId },
        data: { order: stage.order },
      }),
    ]);
  } catch {
    return { ok: false as const, error: "No se pudo reordenar." };
  }
  revalidateStages();
  return { ok: true as const };
}

export async function resetStages(track: string) {
  if (!isTrack(track)) return { ok: false as const, error: "Track inválido." };
  const userId = await currentUserId();
  const presets = getStages(track);
  const presetKeys = presets.map((s) => s.key);
  try {
    await prisma.$transaction([
      prisma.pipelineStage.deleteMany({ where: { userId, track } }),
      prisma.pipelineStage.createMany({
        data: presets.map((s, i) => ({
          userId,
          track,
          key: s.key,
          label: s.label,
          order: i,
          type: s.type,
          probability: s.probability,
        })),
      }),
      // Cards en etapas que ya no existen quedarían fuera del tablero: las
      // reasignamos a la primera etapa para que no se pierdan.
      prisma.opportunity.updateMany({
        where: { userId, track, stage: { notIn: presetKeys } },
        data: { stage: presetKeys[0] },
      }),
    ]);
  } catch {
    return { ok: false as const, error: "No se pudo restaurar las etapas." };
  }
  revalidateStages();
  return { ok: true as const };
}
