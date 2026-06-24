"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizeUrl } from "@/lib/utils";
import { isTrack, DEFAULT_TRACK } from "@/lib/tracks";

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
  if (!input.name?.trim()) {
    return { ok: false as const, error: "El nombre es obligatorio." };
  }
  const track = isTrack(input.track) ? input.track : DEFAULT_TRACK;
  const company = await prisma.company.create({
    data: { ...clean(input), track },
  });
  revalidatePath("/empresas");
  return { ok: true as const, id: company.id };
}

export async function updateCompany(id: string, input: CompanyInput) {
  if (!input.name?.trim()) {
    return { ok: false as const, error: "El nombre es obligatorio." };
  }
  await prisma.company.update({ where: { id }, data: clean(input) });
  revalidatePath("/empresas");
  revalidatePath(`/empresas/${id}`);
  return { ok: true as const, id };
}

export async function deleteCompany(id: string) {
  await prisma.company.delete({ where: { id } });
  revalidatePath("/empresas");
  return { ok: true as const };
}
