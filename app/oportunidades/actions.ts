"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import type { Stage, Priority } from "@/lib/generated/prisma/client";

export type OpportunityInput = {
  title: string;
  companyId?: string;
  stage: Stage;
  url?: string;
  location?: string;
  salaryRange?: string;
  jobDescription?: string;
  priority: Priority;
  appliedAt?: string; // yyyy-MM-dd
  nextFollowUpAt?: string; // yyyy-MM-dd
  cvVersionId?: string;
  notes?: string;
};

function clean(input: OpportunityInput) {
  return {
    title: input.title.trim(),
    companyId: input.companyId || null,
    stage: input.stage,
    url: input.url?.trim() || null,
    location: input.location?.trim() || null,
    salaryRange: input.salaryRange?.trim() || null,
    jobDescription: input.jobDescription?.trim() || null,
    priority: input.priority,
    appliedAt: parseDateInput(input.appliedAt),
    nextFollowUpAt: parseDateInput(input.nextFollowUpAt),
    cvVersionId: input.cvVersionId || null,
    notes: input.notes?.trim() || null,
  };
}

export async function createOpportunity(input: OpportunityInput) {
  if (!input.title?.trim()) {
    return { ok: false as const, error: "El título es obligatorio." };
  }
  const opportunity = await prisma.opportunity.create({ data: clean(input) });
  revalidatePath("/oportunidades");
  return { ok: true as const, id: opportunity.id };
}

export async function updateOpportunity(id: string, input: OpportunityInput) {
  if (!input.title?.trim()) {
    return { ok: false as const, error: "El título es obligatorio." };
  }
  await prisma.opportunity.update({ where: { id }, data: clean(input) });
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
  return { ok: true as const, id };
}

export async function deleteOpportunity(id: string) {
  await prisma.opportunity.delete({ where: { id } });
  revalidatePath("/oportunidades");
  return { ok: true as const };
}

export async function updateOpportunityStage(id: string, stage: Stage) {
  const data: { stage: Stage; appliedAt?: Date } = { stage };
  // Si pasa a Aplicada y no tenía fecha, la marcamos ahora.
  if (stage === "APPLIED") {
    const current = await prisma.opportunity.findUnique({
      where: { id },
      select: { appliedAt: true },
    });
    if (current && !current.appliedAt) data.appliedAt = new Date();
  }
  await prisma.opportunity.update({ where: { id }, data });
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
  return { ok: true as const };
}
