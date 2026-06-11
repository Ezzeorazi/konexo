"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import type {
  RelationshipStrength,
  TouchpointType,
} from "@/lib/generated/prisma/client";

export type ContactInput = {
  name: string;
  role?: string;
  companyId?: string;
  email?: string;
  linkedinUrl?: string;
  phone?: string;
  relationshipStrength: RelationshipStrength;
  nextFollowUpAt?: string; // yyyy-MM-dd
  notes?: string;
};

function clean(input: ContactInput) {
  return {
    name: input.name.trim(),
    role: input.role?.trim() || null,
    companyId: input.companyId || null,
    email: input.email?.trim() || null,
    linkedinUrl: input.linkedinUrl?.trim() || null,
    phone: input.phone?.trim() || null,
    relationshipStrength: input.relationshipStrength,
    nextFollowUpAt: parseDateInput(input.nextFollowUpAt),
    notes: input.notes?.trim() || null,
  };
}

export async function createContact(input: ContactInput) {
  if (!input.name?.trim()) {
    return { ok: false as const, error: "El nombre es obligatorio." };
  }
  const contact = await prisma.contact.create({ data: clean(input) });
  revalidatePath("/contactos");
  return { ok: true as const, id: contact.id };
}

export async function updateContact(id: string, input: ContactInput) {
  if (!input.name?.trim()) {
    return { ok: false as const, error: "El nombre es obligatorio." };
  }
  await prisma.contact.update({ where: { id }, data: clean(input) });
  revalidatePath("/contactos");
  revalidatePath(`/contactos/${id}`);
  return { ok: true as const, id };
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
  revalidatePath("/contactos");
  return { ok: true as const };
}

export type TouchpointInput = {
  type: TouchpointType;
  note?: string;
  occurredAt?: string; // yyyy-MM-dd
  contactId?: string;
  opportunityId?: string;
};

export async function createTouchpoint(input: TouchpointInput) {
  if (!input.contactId && !input.opportunityId) {
    return {
      ok: false as const,
      error: "El touchpoint tiene que estar ligado a un contacto o a una oportunidad.",
    };
  }
  await prisma.touchpoint.create({
    data: {
      type: input.type,
      note: input.note?.trim() || null,
      occurredAt: parseDateInput(input.occurredAt) ?? new Date(),
      contactId: input.contactId || null,
      opportunityId: input.opportunityId || null,
    },
  });
  if (input.contactId) revalidatePath(`/contactos/${input.contactId}`);
  if (input.opportunityId)
    revalidatePath(`/oportunidades/${input.opportunityId}`);
  return { ok: true as const };
}
