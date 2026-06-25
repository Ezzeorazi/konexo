"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { normalizeUrl } from "@/lib/utils";
import { isTrack, DEFAULT_TRACK } from "@/lib/tracks";
import { CompanySchema, firstZodError } from "@/lib/validation";

export type CompanyInput = {
  name: string;
  track?: string;
  website?: string;
  location?: string;
  industry?: string;
  source?: string;
  notes?: string;
};

function clean(input: CompanyInput) {
  return {
    name: input.name.trim(),
    website: normalizeUrl(input.website),
    location: input.location?.trim() || null,
    industry: input.industry?.trim() || null,
    source: input.source?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function createCompany(input: CompanyInput) {
  const parsed = CompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const track = isTrack(input.track) ? input.track : DEFAULT_TRACK;
  const userId = await currentUserId();
  const company = await prisma.company.create({
    data: { ...clean(input), track, userId },
  });
  revalidatePath("/empresas");
  return { ok: true as const, id: company.id };
}

export async function updateCompany(id: string, input: CompanyInput) {
  const parsed = CompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  const { count } = await prisma.company.updateMany({
    where: { id, userId },
    data: clean(input),
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré la empresa." };
  }
  revalidatePath("/empresas");
  revalidatePath(`/empresas/${id}`);
  return { ok: true as const, id };
}

export async function deleteCompany(id: string) {
  const userId = await currentUserId();
  await prisma.company.deleteMany({ where: { id, userId } });
  revalidatePath("/empresas");
  return { ok: true as const };
}
