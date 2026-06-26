"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab } from "@/lib/tracks";
import { normalizeUrl } from "@/lib/utils";
import { parseDateInput } from "@/lib/dates";
import { CompanySchema, ContactSchema } from "@/lib/validation";
import {
  parseImportWorkbook,
  normalizeName,
  type ParsedCompany,
  type ParsedContact,
} from "@/lib/excel-import";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_ROWS = 1000; // tope por hoja, anti-abuso

export type ImportSummary = {
  empresasCreadas: number;
  empresasDuplicadas: number;
  contactosCreados: number;
  contactosDuplicados: number;
  contactosLinkeados: number;
  contactosSinEmpresa: number;
  trackLabel: string;
  /** Etiqueta del lote (Company.source), para poder deshacer después. */
  batchId: string;
  warnings: string[];
};

export type ImportResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string };

export async function importFromExcel(
  formData: FormData
): Promise<ImportResult> {
  const userId = await currentUserId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No recibí ningún archivo. Adjuntá el Excel." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "El archivo es muy grande (máx. 4 MB)." };
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx")) {
    return {
      ok: false,
      error: "El archivo tiene que ser .xlsx (descargá la plantilla y completala).",
    };
  }

  // El track lo decide el SERVIDOR según el modo activo, nunca el cliente.
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);

  let parsed;
  try {
    const buffer = await file.arrayBuffer();
    parsed = await parseImportWorkbook(buffer);
  } catch {
    return {
      ok: false,
      error: "No pude leer el Excel. ¿Es la plantilla sin modificar la estructura?",
    };
  }

  const warnings = [...parsed.warnings];
  let companies = parsed.companies;
  let contacts = parsed.contacts;
  if (companies.length > MAX_ROWS) {
    warnings.push(`Tomé las primeras ${MAX_ROWS} empresas (había más).`);
    companies = companies.slice(0, MAX_ROWS);
  }
  if (contacts.length > MAX_ROWS) {
    warnings.push(`Tomé los primeros ${MAX_ROWS} contactos (había más).`);
    contacts = contacts.slice(0, MAX_ROWS);
  }

  if (companies.length === 0 && contacts.length === 0) {
    return {
      ok: false,
      error:
        warnings[0] ??
        "El Excel no tiene filas para cargar. Completá las hojas Empresas y Contactos.",
    };
  }

  const batchId = `Importación ${new Date().toISOString().slice(0, 10)}`;

  // ---- Empresas: dedupe contra lo existente (mismo user + track) ----
  const existingCompanies = await prisma.company.findMany({
    where: { userId, track },
    select: { id: true, name: true },
  });
  // nombre normalizado → id (se va llenando con lo existente y lo nuevo).
  const companyByName = new Map<string, string>();
  for (const c of existingCompanies) {
    companyByName.set(normalizeName(c.name), c.id);
  }

  let empresasCreadas = 0;
  let empresasDuplicadas = 0;
  for (const c of companies) {
    const key = normalizeName(c.name);
    if (companyByName.has(key)) {
      empresasDuplicadas++;
      continue;
    }
    const created = await createCompanyRow(c, track, userId, batchId);
    if (!created) {
      warnings.push(`Empresas, fila ${c.row}: datos inválidos, no la cargué.`);
      continue;
    }
    companyByName.set(key, created);
    empresasCreadas++;
  }

  // ---- Contactos: dedupe + resolución de empresa ----
  const existingContacts = await prisma.contact.findMany({
    where: { userId, track },
    select: { name: true, email: true },
  });
  const existingContactKeys = new Set(
    existingContacts.map((c) => contactKey(c.name, c.email))
  );

  let contactosCreados = 0;
  let contactosDuplicados = 0;
  let contactosLinkeados = 0;
  let contactosSinEmpresa = 0;

  for (const ct of contacts) {
    const key = contactKey(ct.name, ct.email);
    if (existingContactKeys.has(key)) {
      contactosDuplicados++;
      continue;
    }
    const companyId = ct.companyName
      ? resolveCompany(ct.companyName, companyByName)
      : null;
    if (ct.companyName) {
      if (companyId) contactosLinkeados++;
      else {
        contactosSinEmpresa++;
        warnings.push(
          `Contactos, fila ${ct.row}: no encontré la empresa "${ct.companyName}", cargué el contacto sin vincular.`
        );
      }
    }
    const created = await createContactRow(ct, companyId, track, userId);
    if (!created) {
      warnings.push(`Contactos, fila ${ct.row}: datos inválidos, no lo cargué.`);
      continue;
    }
    existingContactKeys.add(key);
    contactosCreados++;
  }

  if (empresasCreadas > 0) revalidatePath("/empresas");
  if (contactosCreados > 0) revalidatePath("/contactos");

  return {
    ok: true,
    summary: {
      empresasCreadas,
      empresasDuplicadas,
      contactosCreados,
      contactosDuplicados,
      contactosLinkeados,
      contactosSinEmpresa,
      trackLabel: vocab.name,
      batchId,
      warnings,
    },
  };
}

// ---- helpers ----

function contactKey(name: string, email: string | null): string {
  return `${normalizeName(name)}|${(email ?? "").toLowerCase().trim()}`;
}

/**
 * Resuelve el nombre de empresa de un contacto contra las empresas conocidas.
 * Primero match exacto normalizado; si no, una empresa que contenga (o esté
 * contenida en) el texto del contacto — cubre "AR-FX Agencia" vs
 * "AR-FX Agencia de Marketing Digital".
 */
function resolveCompany(
  companyName: string,
  companyByName: Map<string, string>
): string | null {
  const key = normalizeName(companyName);
  const exact = companyByName.get(key);
  if (exact) return exact;
  if (key.length < 3) return null;
  for (const [name, id] of companyByName) {
    if (name.includes(key) || key.includes(name)) return id;
  }
  return null;
}

async function createCompanyRow(
  c: ParsedCompany,
  track: string,
  userId: string,
  batchId: string
): Promise<string | null> {
  const input = {
    name: c.name,
    website: c.website ?? undefined,
    location: c.location ?? undefined,
    industry: c.industry ?? undefined,
    source: batchId,
    notes: c.notes ?? undefined,
  };
  if (!CompanySchema.safeParse(input).success) return null;
  const company = await prisma.company.create({
    data: {
      name: input.name.trim(),
      website: normalizeUrl(input.website),
      location: input.location?.trim() || null,
      industry: input.industry?.trim() || null,
      source: input.source,
      notes: input.notes?.trim() || null,
      track,
      userId,
    },
  });
  return company.id;
}

async function createContactRow(
  ct: ParsedContact,
  companyId: string | null,
  track: string,
  userId: string
): Promise<boolean> {
  const input = {
    name: ct.name,
    role: ct.role ?? undefined,
    email: ct.email ?? "",
    linkedinUrl: ct.linkedinUrl ?? undefined,
    phone: ct.phone ?? undefined,
    relationshipStrength: ct.relationshipStrength,
    nextFollowUpAt: ct.nextFollowUpAt ?? "",
    notes: ct.notes ?? undefined,
  };
  if (!ContactSchema.safeParse(input).success) return false;
  await prisma.contact.create({
    data: {
      name: input.name.trim(),
      role: input.role?.trim() || null,
      companyId,
      email: input.email.trim() || null,
      linkedinUrl: normalizeUrl(input.linkedinUrl),
      phone: input.phone?.trim() || null,
      relationshipStrength: input.relationshipStrength,
      nextFollowUpAt: parseDateInput(input.nextFollowUpAt),
      notes: input.notes?.trim() || null,
      track,
      userId,
    },
  });
  return true;
}
