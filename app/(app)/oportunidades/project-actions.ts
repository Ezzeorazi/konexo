"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import {
  ProjectNoteSchema,
  ProjectNoteUpdateSchema,
  ProjectTaskSchema,
  ProjectTaskUpdateSchema,
  firstZodError,
} from "@/lib/validation";

// Seguimiento de ejecución del proyecto: bitácora (ideas/avances) + checklist.
// Vive sobre el Opportunity del track freelance, separado del embudo comercial.

/** Confirma que la oportunidad existe y es del usuario antes de colgarle cosas. */
async function assertOwnedOpportunity(userId: string, opportunityId: string) {
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    select: { id: true },
  });
  return Boolean(opp);
}

export type ProjectNoteInput = {
  opportunityId: string;
  kind: string;
  body: string;
};

export async function createProjectNote(input: ProjectNoteInput) {
  const parsed = ProjectNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  if (!(await assertOwnedOpportunity(userId, parsed.data.opportunityId))) {
    return { ok: false as const, error: "No encontré el proyecto." };
  }
  await prisma.projectNote.create({
    data: {
      userId,
      opportunityId: parsed.data.opportunityId,
      kind: parsed.data.kind,
      body: parsed.data.body,
    },
  });
  revalidatePath(`/oportunidades/${parsed.data.opportunityId}`);
  return { ok: true as const };
}

export async function updateProjectNote(
  id: string,
  opportunityId: string,
  input: { kind: string; body: string }
) {
  const parsed = ProjectNoteUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  const { count } = await prisma.projectNote.updateMany({
    where: { id, userId },
    data: { kind: parsed.data.kind, body: parsed.data.body },
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré la entrada." };
  }
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true as const };
}

export async function deleteProjectNote(id: string, opportunityId: string) {
  const userId = await currentUserId();
  await prisma.projectNote.deleteMany({ where: { id, userId } });
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true as const };
}

export type ProjectTaskInput = {
  opportunityId: string;
  title: string;
};

export async function createProjectTask(input: ProjectTaskInput) {
  const parsed = ProjectTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  if (!(await assertOwnedOpportunity(userId, parsed.data.opportunityId))) {
    return { ok: false as const, error: "No encontré el proyecto." };
  }
  const order = await prisma.projectTask.count({
    where: { userId, opportunityId: parsed.data.opportunityId },
  });
  await prisma.projectTask.create({
    data: {
      userId,
      opportunityId: parsed.data.opportunityId,
      title: parsed.data.title,
      order,
    },
  });
  revalidatePath(`/oportunidades/${parsed.data.opportunityId}`);
  return { ok: true as const };
}

export async function updateProjectTask(
  id: string,
  opportunityId: string,
  title: string
) {
  const parsed = ProjectTaskUpdateSchema.safeParse({ title });
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  const { count } = await prisma.projectTask.updateMany({
    where: { id, userId },
    data: { title: parsed.data.title },
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré la tarea." };
  }
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true as const };
}

export async function toggleProjectTask(
  id: string,
  opportunityId: string,
  done: boolean
) {
  const userId = await currentUserId();
  await prisma.projectTask.updateMany({
    where: { id, userId },
    // Registramos cuándo se completó (o lo limpiamos al destildar) para poder
    // contar lo cerrado en el día en el "Cierre del día".
    data: { done, completedAt: done ? new Date() : null },
  });
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true as const };
}

export async function deleteProjectTask(id: string, opportunityId: string) {
  const userId = await currentUserId();
  await prisma.projectTask.deleteMany({ where: { id, userId } });
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true as const };
}

/** Reasigna `order` según el nuevo orden de ids (drag & drop). Solo toca las
 * tareas del usuario que pertenecen a esta oportunidad. */
export async function reorderProjectTasks(
  opportunityId: string,
  orderedIds: string[]
) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: true as const };
  }
  const userId = await currentUserId();
  const ids = orderedIds.slice(0, 500);
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.projectTask.updateMany({
        where: { id, userId, opportunityId },
        data: { order: index },
      })
    )
  );
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true as const };
}
