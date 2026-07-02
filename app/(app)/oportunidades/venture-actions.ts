"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { VentureSchema, firstZodError } from "@/lib/validation";

// Emprendimientos (Venture): negocios propios del usuario para segmentar el
// pipeline de Ventas. CRUD simple, scopeado por usuario.

export async function createVenture(input: {
  name: string;
  color?: string;
  emoji?: string;
}) {
  const parsed = VentureSchema.safeParse({ name: input.name });
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  const venture = await prisma.venture.create({
    data: {
      userId,
      name: parsed.data.name,
      color: input.color?.trim() || null,
      emoji: input.emoji?.trim() || null,
    },
  });
  revalidatePath("/oportunidades");
  return { ok: true as const, id: venture.id };
}

export async function updateVenture(
  id: string,
  input: { name?: string; color?: string | null; emoji?: string | null }
) {
  const userId = await currentUserId();
  const data: { name?: string; color?: string | null; emoji?: string | null } =
    {};
  if (input.name !== undefined) {
    const parsed = VentureSchema.safeParse({ name: input.name });
    if (!parsed.success) {
      return { ok: false as const, error: firstZodError(parsed.error) };
    }
    data.name = parsed.data.name;
  }
  if (input.color !== undefined) data.color = input.color || null;
  if (input.emoji !== undefined) data.emoji = input.emoji || null;

  const { count } = await prisma.venture.updateMany({
    where: { id, userId },
    data,
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré el emprendimiento." };
  }
  revalidatePath("/oportunidades");
  return { ok: true as const };
}

export async function deleteVenture(id: string) {
  const userId = await currentUserId();
  // Las oportunidades ligadas quedan sin emprendimiento (FK SetNull).
  await prisma.venture.deleteMany({ where: { id, userId } });
  revalidatePath("/oportunidades");
  return { ok: true as const };
}
