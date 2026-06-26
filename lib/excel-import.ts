// Importación de Empresas + Contactos desde un Excel con FORMATO FIJO.
//
// El formato lo define la plantilla descargable (buildTemplateWorkbook). Este
// archivo es la ÚNICA fuente de verdad: las mismas definiciones de columnas se
// usan para GENERAR la plantilla y para PARSEAR lo que sube el usuario, así no
// se pueden desincronizar.
//
// El parseo es 100% determinista (no IA): el template es rígido, las columnas
// mapean 1:1 al schema. La IA del chat queda para el resumen conversacional y,
// si hace falta, el matcheo difuso de contacto↔empresa (ver import-actions).

import ExcelJS from "exceljs";
import type { RelationshipStrength } from "@/lib/generated/prisma/client";

export const TEMPLATE_FILE_NAME = "plantilla-konexo.xlsx";

export const SHEETS = {
  empresas: "Empresas",
  contactos: "Contactos",
  instrucciones: "Instrucciones",
} as const;

// Encabezados EXACTOS de cada hoja. El orden acá define el orden en la plantilla.
export const EMPRESA_HEADERS = [
  "Empresa",
  "Categoría",
  "Ciudad",
  "Sitio web",
  "Notas",
] as const;

export const CONTACTO_HEADERS = [
  "Nombre",
  "Empresa",
  "Rol",
  "Relación",
  "Email",
  "Teléfono",
  "LinkedIn",
  "Próximo follow-up",
  "Notas",
] as const;

export type ParsedCompany = {
  name: string;
  industry: string | null;
  location: string | null;
  website: string | null;
  notes: string | null;
  /** Fila del Excel (para mensajes de error legibles). */
  row: number;
};

export type ParsedContact = {
  name: string;
  /** Nombre de empresa tal cual lo escribió el usuario (se resuelve luego). */
  companyName: string | null;
  role: string | null;
  relationshipStrength: RelationshipStrength;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  /** yyyy-MM-dd o null. */
  nextFollowUpAt: string | null;
  notes: string | null;
  row: number;
};

export type ParseResult = {
  companies: ParsedCompany[];
  contacts: ParsedContact[];
  /** Avisos no fatales (filas salteadas, fechas inválidas, etc.). */
  warnings: string[];
};

// ---- Normalización ----

/** minúsculas, sin acentos, espacios colapsados. Para comparar nombres/headers. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const RELATIONSHIP_MAP: Record<string, RelationshipStrength> = {
  frio: "COLD",
  cold: "COLD",
  nuevo: "COLD",
  tibio: "WARM",
  templado: "WARM",
  medio: "WARM",
  warm: "WARM",
  fuerte: "STRONG",
  caliente: "STRONG",
  solido: "STRONG",
  strong: "STRONG",
};

/** "Frío" → COLD. Lo que no reconoce cae a COLD (el vínculo más conservador). */
export function parseRelationship(value: string): RelationshipStrength {
  return RELATIONSHIP_MAP[normalizeName(value)] ?? "COLD";
}

/** Coacciona cualquier valor de celda de exceljs a string limpio. */
function cellToString(value: ExcelJS.CellValue | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "";
  if (value instanceof Date) return toDateString(value) ?? "";
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("").trim();
    }
    if ("text" in value) return String(value.text).trim(); // hyperlink
    if ("result" in value) return cellToString(value.result); // fórmula
    if ("hyperlink" in value) return String(value.hyperlink).trim();
  }
  return String(value).trim();
}

/** Devuelve yyyy-MM-dd a partir de un valor de celda (Date o texto), o null. */
function toDateString(value: ExcelJS.CellValue | null | undefined): string | null {
  if (value instanceof Date) {
    // exceljs guarda las fechas en UTC; usamos getUTC* para no correr el día.
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const text = cellToString(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // dd/mm/aaaa o dd-mm-aaaa
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${m}-${d}`;
  }
  return null;
}

// ---- Parseo del workbook ----

function findSheet(
  wb: ExcelJS.Workbook,
  name: string
): ExcelJS.Worksheet | undefined {
  const target = normalizeName(name);
  return wb.worksheets.find((ws) => normalizeName(ws.name) === target);
}

/**
 * Localiza la fila de encabezados (entre las primeras filas) y devuelve, por
 * cada fila de datos, un mapa header→valor crudo de celda + el número de fila.
 */
function extractRows(
  ws: ExcelJS.Worksheet | undefined,
  headers: readonly string[]
): { values: Record<string, ExcelJS.CellValue | null>; row: number }[] {
  if (!ws) return [];
  const normHeaders = headers.map((h) => normalizeName(h));

  let headerRow = -1;
  const colByHeader = new Map<string, number>();
  const lastScan = Math.min(ws.rowCount || 0, 15);
  for (let r = 1; r <= lastScan; r++) {
    const row = ws.getRow(r);
    const found = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const txt = normalizeName(cellToString(cell.value));
      const idx = normHeaders.indexOf(txt);
      if (idx !== -1) found.set(headers[idx], col);
    });
    if (found.size >= Math.ceil(headers.length / 2)) {
      headerRow = r;
      for (const [k, v] of found) colByHeader.set(k, v);
      break;
    }
  }
  if (headerRow === -1) return [];

  const out: { values: Record<string, ExcelJS.CellValue | null>; row: number }[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const values: Record<string, ExcelJS.CellValue | null> = {};
    let any = false;
    for (const h of headers) {
      const col = colByHeader.get(h);
      const cellValue = col ? row.getCell(col).value : null;
      values[h] = cellValue ?? null;
      if (cellToString(cellValue)) any = true;
    }
    if (any) out.push({ values, row: r });
  }
  return out;
}

const nullable = (s: string): string | null => (s ? s : null);

export async function parseImportWorkbook(
  buffer: ArrayBuffer | Buffer
): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  // exceljs acepta Buffer; ArrayBuffer lo envolvemos. El cast evita el choque de
  // tipos entre el Buffer de @types/node y el que declara exceljs.
  const nodeBuffer = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(buffer as ArrayBuffer);
  await wb.xlsx.load(nodeBuffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const warnings: string[] = [];

  const empresasSheet = findSheet(wb, SHEETS.empresas);
  const contactosSheet = findSheet(wb, SHEETS.contactos);
  if (!empresasSheet && !contactosSheet) {
    return {
      companies: [],
      contacts: [],
      warnings: [
        `No encontré las hojas "${SHEETS.empresas}" ni "${SHEETS.contactos}". Usá la plantilla descargable y no cambies los nombres de las hojas.`,
      ],
    };
  }

  const companies: ParsedCompany[] = [];
  for (const { values, row } of extractRows(empresasSheet, EMPRESA_HEADERS)) {
    const name = cellToString(values["Empresa"]);
    if (!name) {
      warnings.push(`Empresas, fila ${row}: sin nombre de empresa, la salteé.`);
      continue;
    }
    companies.push({
      name,
      industry: nullable(cellToString(values["Categoría"])),
      location: nullable(cellToString(values["Ciudad"])),
      website: nullable(cellToString(values["Sitio web"])),
      notes: nullable(cellToString(values["Notas"])),
      row,
    });
  }

  const contacts: ParsedContact[] = [];
  for (const { values, row } of extractRows(contactosSheet, CONTACTO_HEADERS)) {
    const name = cellToString(values["Nombre"]);
    if (!name) {
      warnings.push(`Contactos, fila ${row}: sin nombre de contacto, la salteé.`);
      continue;
    }
    const rawDate = values["Próximo follow-up"];
    const followUp = toDateString(rawDate);
    if (cellToString(rawDate) && !followUp) {
      warnings.push(
        `Contactos, fila ${row}: la fecha de follow-up no tiene formato AAAA-MM-DD, la ignoré.`
      );
    }
    contacts.push({
      name,
      companyName: nullable(cellToString(values["Empresa"])),
      role: nullable(cellToString(values["Rol"])),
      relationshipStrength: parseRelationship(cellToString(values["Relación"])),
      email: nullable(cellToString(values["Email"])),
      phone: nullable(cellToString(values["Teléfono"])),
      linkedinUrl: nullable(cellToString(values["LinkedIn"])),
      nextFollowUpAt: followUp,
      notes: nullable(cellToString(values["Notas"])),
      row,
    });
  }

  return { companies, contacts, warnings };
}

// ---- Generación de la plantilla (mismo formato que el parser) ----

const INK = "FF1A1A1A";
const PAPER = "FFFFFDF7";

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: PAPER }, size: 11 };
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: INK },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
}

/**
 * Construye la plantilla descargable: 3 hojas (Instrucciones, Empresas,
 * Contactos) con encabezados, ejemplos y el formato de celda correcto
 * (texto en Teléfono y en la fecha para que no se rompan).
 */
export function buildTemplateWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Konexo";
  wb.created = new Date();

  // --- Hoja Instrucciones ---
  const guia = wb.addWorksheet(SHEETS.instrucciones, {
    properties: { tabColor: { argb: "FFFFC400" } },
  });
  guia.getColumn(1).width = 100;
  const lines: { text: string; bold?: boolean }[] = [
    { text: "CÓMO USAR ESTA PLANTILLA", bold: true },
    { text: "" },
    { text: "1) Completá la hoja \"Empresas\" y la hoja \"Contactos\". No cambies los nombres de las hojas ni de las columnas (la fila 1 de cada hoja)." },
    { text: "2) Guardá el archivo y subílo por el chat del asistente (botón del clip 📎)." },
    { text: "3) Los datos se cargan en el MODO en el que estés (Búsqueda laboral, Ventas, Freelance, etc.). Cambiá de modo antes de importar si querés cargarlos en otro." },
    { text: "" },
    { text: "FORMATO DE LAS CELDAS — importante", bold: true },
    { text: "• Empresa (en Contactos): escribí el nombre EXACTAMENTE igual que en la hoja Empresas para que se vinculen. Si no coincide, el contacto se carga sin empresa." },
    { text: "• Relación: usá una de estas palabras → Frío, Tibio o Fuerte. (Cualquier otra cosa se toma como Frío.)" },
    { text: "• Próximo follow-up: formato AAAA-MM-DD (ej.: 2026-07-15). Dejá la celda como TEXTO para que no se transforme sola." },
    { text: "• Teléfono: dejá la celda como TEXTO para no perder el + ni los ceros iniciales (ej.: +52 984 191 8498)." },
    { text: "• Email / LinkedIn / Sitio web: opcionales. El sitio web puede ir sin https:// (se completa solo)." },
    { text: "• Filas vacías: se ignoran. Una empresa o contacto SIN nombre se saltea." },
    { text: "" },
    { text: "Podés borrar las filas de ejemplo antes de cargar las tuyas." },
  ];
  lines.forEach((l, i) => {
    const cell = guia.getCell(i + 1, 1);
    cell.value = l.text;
    cell.font = { bold: l.bold, size: l.bold ? 13 : 11 };
    cell.alignment = { wrapText: true, vertical: "top" };
  });

  // --- Hoja Empresas ---
  const empresas = wb.addWorksheet(SHEETS.empresas, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  empresas.columns = [
    { header: EMPRESA_HEADERS[0], width: 34 },
    { header: EMPRESA_HEADERS[1], width: 22 },
    { header: EMPRESA_HEADERS[2], width: 22 },
    { header: EMPRESA_HEADERS[3], width: 28 },
    { header: EMPRESA_HEADERS[4], width: 50 },
  ];
  styleHeaderRow(empresas.getRow(1));
  empresas.addRow([
    "AR-FX Agencia de Marketing Digital",
    "Agencia / Marketing",
    "Playa del Carmen",
    "ar-fx.mx",
    "SEO y gestión Airbnb. Ofrecerles landings/sitios para sus clientes.",
  ]);
  empresas.addRow([
    "Hotel Boutique Tulum",
    "Hotelería",
    "Tulum",
    "",
    "Buscan rehacer su web de reservas.",
  ]);

  // --- Hoja Contactos ---
  const contactos = wb.addWorksheet(SHEETS.contactos, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  contactos.columns = [
    { header: CONTACTO_HEADERS[0], width: 22 }, // Nombre
    { header: CONTACTO_HEADERS[1], width: 34 }, // Empresa
    { header: CONTACTO_HEADERS[2], width: 22 }, // Rol
    { header: CONTACTO_HEADERS[3], width: 12 }, // Relación
    { header: CONTACTO_HEADERS[4], width: 26 }, // Email
    { header: CONTACTO_HEADERS[5], width: 20 }, // Teléfono
    { header: CONTACTO_HEADERS[6], width: 28 }, // LinkedIn
    { header: CONTACTO_HEADERS[7], width: 18 }, // Próximo follow-up
    { header: CONTACTO_HEADERS[8], width: 40 }, // Notas
  ];
  // Teléfono y Próximo follow-up como TEXTO para no romper el formato.
  contactos.getColumn(6).numFmt = "@";
  contactos.getColumn(8).numFmt = "@";
  styleHeaderRow(contactos.getRow(1));
  contactos.addRow([
    "Richard",
    "AR-FX Agencia de Marketing Digital",
    "Dueño / Director",
    "Frío",
    "",
    "+52 984 191 8498",
    "",
    "2026-07-15",
    "Pedir por Richard. Ángulo: brazo de desarrollo para sus clientes Airbnb.",
  ]);

  return wb;
}
