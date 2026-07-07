import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  normalizeName,
  parseRelationship,
  parseImportWorkbook,
  buildTemplateWorkbook,
  EMPRESA_HEADERS,
  CONTACTO_HEADERS,
  SHEETS,
} from "@/lib/excel-import";

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

describe("normalizeName", () => {
  it("baja a minúsculas, saca acentos y colapsa espacios", () => {
    expect(normalizeName("  Categoría  ")).toBe("categoria");
    expect(normalizeName("SITIO   WEB")).toBe("sitio web");
    expect(normalizeName("Próximo follow-up")).toBe("proximo follow-up");
  });
});

describe("parseRelationship", () => {
  it("mapea las palabras en español (con y sin acento)", () => {
    expect(parseRelationship("Frío")).toBe("COLD");
    expect(parseRelationship("frio")).toBe("COLD");
    expect(parseRelationship("Tibio")).toBe("WARM");
    expect(parseRelationship("Fuerte")).toBe("STRONG");
  });

  it("mapea sinónimos y términos en inglés", () => {
    expect(parseRelationship("caliente")).toBe("STRONG");
    expect(parseRelationship("warm")).toBe("WARM");
    expect(parseRelationship("cold")).toBe("COLD");
  });

  it("cae a COLD ante cualquier valor desconocido o vacío", () => {
    expect(parseRelationship("cualquier cosa")).toBe("COLD");
    expect(parseRelationship("")).toBe("COLD");
  });
});

describe("parseImportWorkbook · round-trip con la plantilla generada", () => {
  it("parsea sin warnings las filas de ejemplo de la plantilla", async () => {
    const buf = await toBuffer(buildTemplateWorkbook());
    const result = await parseImportWorkbook(buf);

    // La plantilla trae 2 empresas y 1 contacto de ejemplo.
    expect(result.companies).toHaveLength(2);
    expect(result.contacts).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);

    const [c1] = result.companies;
    expect(c1.name).toBe("AR-FX Agencia de Marketing Digital");
    expect(c1.industry).toBe("Agencia / Marketing");
    expect(c1.location).toBe("Playa del Carmen");

    const [contact] = result.contacts;
    expect(contact.name).toBe("Richard");
    expect(contact.companyName).toBe("AR-FX Agencia de Marketing Digital");
    expect(contact.relationshipStrength).toBe("COLD"); // "Frío"
    expect(contact.nextFollowUpAt).toBe("2026-07-15");
  });
});

// --- Helpers para construir workbooks a medida ---
function makeWorkbook(opts: {
  empresas?: (string | number | null)[][];
  contactos?: (string | number | null)[][];
  empresaHeaders?: readonly string[];
}): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  if (opts.empresas) {
    const ws = wb.addWorksheet(SHEETS.empresas);
    ws.addRow([...(opts.empresaHeaders ?? EMPRESA_HEADERS)]);
    for (const r of opts.empresas) ws.addRow(r);
  }
  if (opts.contactos) {
    const ws = wb.addWorksheet(SHEETS.contactos);
    ws.addRow([...CONTACTO_HEADERS]);
    for (const r of opts.contactos) ws.addRow(r);
  }
  return wb;
}

describe("parseImportWorkbook · casos de borde", () => {
  it("avisa cuando faltan ambas hojas", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Otra");
    const result = await parseImportWorkbook(await toBuffer(wb));
    expect(result.companies).toHaveLength(0);
    expect(result.contacts).toHaveLength(0);
    expect(result.warnings[0]).toContain("No encontré las hojas");
  });

  it("saltea una empresa sin nombre y lo avisa", async () => {
    const wb = makeWorkbook({
      empresas: [
        ["Acme", "Tech", "CABA", "acme.com", "nota"],
        ["", "Sin nombre", "X", "", ""],
      ],
    });
    const result = await parseImportWorkbook(await toBuffer(wb));
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].name).toBe("Acme");
    expect(result.warnings.some((w) => w.includes("sin nombre de empresa"))).toBe(true);
  });

  it("ignora filas totalmente vacías sin generar warnings", async () => {
    const wb = makeWorkbook({
      empresas: [
        ["Acme", "Tech", "CABA", "acme.com", "nota"],
        [null, null, null, null, null],
      ],
    });
    const result = await parseImportWorkbook(await toBuffer(wb));
    expect(result.companies).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  it("detecta los encabezados aunque estén en otro orden", async () => {
    const reordered = ["Notas", "Empresa", "Ciudad", "Sitio web", "Categoría"] as const;
    const wb = makeWorkbook({
      empresaHeaders: reordered,
      empresas: [["una nota", "Acme", "CABA", "acme.com", "Tech"]],
    });
    const result = await parseImportWorkbook(await toBuffer(wb));
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].name).toBe("Acme");
    expect(result.companies[0].industry).toBe("Tech");
    expect(result.companies[0].notes).toBe("una nota");
  });

  it("avisa cuando una fecha de follow-up tiene formato inválido y la ignora", async () => {
    const wb = makeWorkbook({
      // Nombre, Empresa, Rol, Relación, Email, Teléfono, LinkedIn, Follow-up, Notas
      contactos: [
        ["Ana", "Acme", "CEO", "Fuerte", "a@b.com", "", "", "no-es-fecha", ""],
      ],
    });
    const result = await parseImportWorkbook(await toBuffer(wb));
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].nextFollowUpAt).toBeNull();
    expect(result.contacts[0].relationshipStrength).toBe("STRONG");
    expect(result.warnings.some((w) => w.includes("follow-up"))).toBe(true);
  });

  it("acepta fechas en formato dd/mm/aaaa y las normaliza a ISO", async () => {
    const wb = makeWorkbook({
      contactos: [
        ["Ana", "Acme", "CEO", "Fuerte", "", "", "", "15/07/2026", ""],
      ],
    });
    const result = await parseImportWorkbook(await toBuffer(wb));
    expect(result.contacts[0].nextFollowUpAt).toBe("2026-07-15");
    expect(result.warnings).toHaveLength(0);
  });

  it("saltea un contacto sin nombre y lo avisa", async () => {
    const wb = makeWorkbook({
      contactos: [
        ["", "Acme", "CEO", "Frío", "", "", "", "", ""],
      ],
    });
    const result = await parseImportWorkbook(await toBuffer(wb));
    expect(result.contacts).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("sin nombre de contacto"))).toBe(true);
  });
});
