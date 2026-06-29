"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { track as trackEvent } from "@/lib/analytics";
import { maybeTrackActivation } from "@/lib/activation";
import { parseDateInput } from "@/lib/dates";
import { normalizeUrl } from "@/lib/utils";
import { isTrack, DEFAULT_TRACK } from "@/lib/tracks";
import { ContactSchema, TouchpointSchema, firstZodError } from "@/lib/validation";
import type {
  RelationshipStrength,
  TouchpointType,
} from "@/lib/generated/prisma/client";

export type ContactInput = {
  name: string;
  track?: string;
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
    linkedinUrl: normalizeUrl(input.linkedinUrl),
    phone: input.phone?.trim() || null,
    relationshipStrength: input.relationshipStrength,
    nextFollowUpAt: parseDateInput(input.nextFollowUpAt),
    notes: input.notes?.trim() || null,
  };
}

export async function createContact(input: ContactInput) {
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const track = isTrack(input.track) ? input.track : DEFAULT_TRACK;
  const userId = await currentUserId();
  const contact = await prisma.contact.create({
    data: { ...clean(input), track, userId },
  });
  revalidatePath("/contactos");
  return { ok: true as const, id: contact.id };
}

export async function updateContact(id: string, input: ContactInput) {
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  const userId = await currentUserId();
  const { count } = await prisma.contact.updateMany({
    where: { id, userId },
    data: clean(input),
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré el contacto." };
  }
  revalidatePath("/contactos");
  revalidatePath(`/contactos/${id}`);
  return { ok: true as const, id };
}

// --- Edición in-context (un campo a la vez) ---------------------------------

const CONTACT_FIELDS = [
  "name",
  "role",
  "companyId",
  "email",
  "linkedinUrl",
  "phone",
  "relationshipStrength",
  "nextFollowUpAt",
  "notes",
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

function cleanContactField(
  field: ContactField,
  value: string
): Record<string, unknown> {
  switch (field) {
    case "name":
      return { name: value.trim() };
    case "role":
      return { role: value.trim() || null };
    case "companyId":
      return { companyId: value || null };
    case "email":
      return { email: value.trim() || null };
    case "linkedinUrl":
      return { linkedinUrl: normalizeUrl(value) };
    case "phone":
      return { phone: value.trim() || null };
    case "relationshipStrength":
      return { relationshipStrength: value as RelationshipStrength };
    case "nextFollowUpAt":
      return { nextFollowUpAt: parseDateInput(value) };
    case "notes":
      return { notes: value.trim() || null };
  }
}

export async function patchContactField(
  id: string,
  field: ContactField,
  value: string
) {
  if (!CONTACT_FIELDS.includes(field)) {
    return { ok: false as const, error: "Campo no editable." };
  }
  const mask = { [field]: true } as { [K in ContactField]?: true };
  const parsed = ContactSchema.pick(mask).safeParse({ [field]: value });
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }

  const userId = await currentUserId();
  const { count } = await prisma.contact.updateMany({
    where: { id, userId },
    data: cleanContactField(field, value),
  });
  if (count === 0) {
    return { ok: false as const, error: "No encontré el contacto." };
  }
  revalidatePath("/contactos");
  revalidatePath(`/contactos/${id}`);
  return { ok: true as const };
}

export async function deleteContact(id: string) {
  const userId = await currentUserId();
  await prisma.contact.deleteMany({ where: { id, userId } });
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
  const parsed = TouchpointSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodError(parsed.error) };
  }
  if (!input.contactId && !input.opportunityId) {
    return {
      ok: false as const,
      error: "El touchpoint tiene que estar ligado a un contacto o a una oportunidad.",
    };
  }
  const userId = await currentUserId();
  // Solo se puede ligar a entidades propias.
  if (input.contactId) {
    const owned = await prisma.contact.count({
      where: { id: input.contactId, userId },
    });
    if (owned === 0)
      return { ok: false as const, error: "No encontré ese contacto." };
  }
  if (input.opportunityId) {
    const owned = await prisma.opportunity.count({
      where: { id: input.opportunityId, userId },
    });
    if (owned === 0)
      return { ok: false as const, error: "No encontré esa oportunidad." };
  }
  await prisma.touchpoint.create({
    data: {
      userId,
      type: input.type,
      note: input.note?.trim() || null,
      occurredAt: parseDateInput(input.occurredAt) ?? new Date(),
      contactId: input.contactId || null,
      opportunityId: input.opportunityId || null,
    },
  });
  await trackEvent(userId, "followup_completed", { type: input.type });
  await maybeTrackActivation(userId);
  if (input.contactId) revalidatePath(`/contactos/${input.contactId}`);
  if (input.opportunityId)
    revalidatePath(`/oportunidades/${input.opportunityId}`);
  return { ok: true as const };
}
