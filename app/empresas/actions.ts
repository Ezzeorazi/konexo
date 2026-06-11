"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CompanyInput = {
  name: string;
  website?: string;
  location?: string;
  industry?: string;
  source?: string;
  notes?: string;
};

function clean(input: CompanyInput) {
  return {
    name: input.name.trim(),
    website: input.website?.trim() || null,
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
  const company = await prisma.company.create({ data: clean(input) });
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
