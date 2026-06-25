import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import {
  getStages as presetStages,
  type StageDef,
  type StageType,
  type Track,
} from "@/lib/tracks";

function rowToDef(r: {
  key: string;
  label: string;
  type: string;
  probability: number;
}): StageDef {
  return {
    key: r.key,
    label: r.label,
    type: r.type as StageType,
    probability: r.probability,
  };
}

/**
 * Etapas del track desde la DB. La primera vez que se piden, se siembran
 * desde los presets de código (lib/tracks.ts) y quedan editables.
 */
export async function getTrackStages(track: Track): Promise<StageDef[]> {
  const userId = await currentUserId();
  const rows = await prisma.pipelineStage.findMany({
    where: { userId, track },
    orderBy: { order: "asc" },
  });
  if (rows.length > 0) return rows.map(rowToDef);

  // Auto-seed desde los presets. createMany sin skipDuplicates (sqlite);
  // ante una carrera, ignoramos el error y releemos.
  const presets = presetStages(track);
  try {
    await prisma.pipelineStage.createMany({
      data: presets.map((s, i) => ({
        userId,
        track,
        key: s.key,
        label: s.label,
        order: i,
        type: s.type,
        probability: s.probability,
      })),
    });
  } catch {
    // otra request sembró primero
  }
  const seeded = await prisma.pipelineStage.findMany({
    where: { userId, track },
    orderBy: { order: "asc" },
  });
  return seeded.length > 0 ? seeded.map(rowToDef) : presets;
}

/** Filas completas (con id) para el editor de etapas. */
export async function getTrackStagesFull(track: Track) {
  const userId = await currentUserId();
  await getTrackStages(track); // asegura el seed
  return prisma.pipelineStage.findMany({
    where: { userId, track },
    orderBy: { order: "asc" },
  });
}
