import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db, USER_A, USER_B } from "./ctx";

// La IA se mockea con una cola de respuestas (redactor, revisor, corrector).
const aiMock = vi.hoisted(() => ({ queue: [] as { ok: boolean; text?: string; error?: string }[] }));
vi.mock("@/lib/ai", () => ({
  generateAiText: vi.fn(async () => aiMock.queue.shift() ?? { ok: false, error: "sin respuesta" }),
}));

import { analyzeCv, extractCvFromPdf } from "@/app/(app)/configuracion/cv-actions";
import { saveTailoredCv, tailorCv } from "@/app/(app)/oportunidades/cv-tailor-actions";

const fixture = (name: string) =>
  readFileSync(path.join(process.cwd(), "tests/fixtures", name));

function formWith(bytes: Uint8Array, name: string) {
  const form = new FormData();
  form.append("file", new File([bytes as unknown as BlobPart], name, { type: "application/pdf" }));
  return form;
}

describe("extractCvFromPdf · PDF real", () => {
  it("extrae el texto y pasa el chequeo ATS", async () => {
    const res = await extractCvFromPdf(formWith(fixture("cv-texto.pdf"), "cv.pdf"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.pages).toBe(1);
    expect(res.fileName).toBe("cv.pdf");
    expect(res.text).toContain("ana.perez@mail.com");
    expect(res.text).toContain("Next.js");
    expect(res.ats.readable).toBe(true);
  });

  it("un PDF sin capa de texto (escaneado) se detecta", async () => {
    const res = await extractCvFromPdf(formWith(fixture("cv-escaneado.pdf"), "scan.pdf"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.ats.readable).toBe(false);
    expect(res.ats.issues[0].message).toMatch(/escaneado/);
  });

  it("rechaza lo que no es PDF aunque diga .pdf", async () => {
    const fake = new TextEncoder().encode("<html>hola</html>");
    const res = await extractCvFromPdf(formWith(fake, "cv.pdf"));
    expect(res.ok).toBe(false);
  });

  it("rechaza archivos de más de 4 MB", async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set([0x25, 0x50, 0x44, 0x46]);
    const res = await extractCvFromPdf(formWith(big, "big.pdf"));
    expect(res.ok).toBe(false);
  });
});

async function seedJobWithCv(userId = USER_A) {
  const cv = await db().cVVersion.create({
    data: { userId, label: "Base", content: "Ana Pérez. React 5 años en Acme." },
  });
  return db().opportunity.create({
    data: {
      userId,
      title: "Frontend",
      track: "jobs",
      jobDescription: "Buscamos React + AWS",
      cvVersionId: cv.id,
    },
  });
}

const DRAFT = "===COBERTURA===\nReact | CUBIERTO\n===CV===\nCV borrador\n===CARTA===\nCarta borrador";
const FINAL = "===COBERTURA===\nReact | CUBIERTO\nAWS | BRECHA REAL\n===CV===\nCV final\n===CARTA===\nCarta final";

describe("tailorCv · redactor → revisor → corrector", () => {
  it("encadena las tres pasadas y devuelve la versión corregida", async () => {
    const o = await seedJobWithCv();
    aiMock.queue = [
      { ok: true, text: DRAFT },
      { ok: true, text: "[INVENTADO] \"10 años\" no está en el CV" },
      { ok: true, text: FINAL },
    ];
    const res = await tailorCv(o.id);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.sections?.cv).toBe("CV final");
    expect(res.sections?.coverage).toContain("BRECHA REAL");
    expect(res.review).toContain("[INVENTADO]");
  });

  it("si el revisor falla, devuelve el borrador igual", async () => {
    const o = await seedJobWithCv();
    aiMock.queue = [{ ok: true, text: DRAFT }, { ok: false, error: "cuota" }];
    const res = await tailorCv(o.id);
    expect(res.ok && res.sections?.cv).toBe("CV borrador");
  });

  it("si el corrector rompe el formato, cae al borrador con secciones", async () => {
    const o = await seedJobWithCv();
    aiMock.queue = [
      { ok: true, text: DRAFT },
      { ok: true, text: "[ESTILO] ninguno" },
      { ok: true, text: "acá tenés, sin marcadores" },
    ];
    const res = await tailorCv(o.id);
    expect(res.ok && res.sections?.cv).toBe("CV borrador");
  });

  it("no adapta oportunidades de otro usuario", async () => {
    const o = await seedJobWithCv(USER_B);
    aiMock.queue = [{ ok: true, text: DRAFT }];
    expect((await tailorCv(o.id)).ok).toBe(false);
  });
});

describe("saveTailoredCv", () => {
  it("crea la versión y la asigna a la oportunidad", async () => {
    const o = await seedJobWithCv();
    const res = await saveTailoredCv(o.id, "CV final");
    expect(res.ok).toBe(true);
    const opp = await db().opportunity.findUnique({
      where: { id: o.id },
      include: { cvVersion: true },
    });
    expect(opp?.cvVersion?.content).toBe("CV final");
    expect(opp?.cvVersion?.label).toContain("Frontend");
    expect(await db().cVVersion.count()).toBe(2);
  });

  it("no guarda en oportunidades ajenas", async () => {
    const o = await seedJobWithCv(USER_B);
    expect((await saveTailoredCv(o.id, "x")).ok).toBe(false);
    expect(await db().cVVersion.count({ where: { userId: USER_A } })).toBe(0);
  });
});

describe("analyzeCv", () => {
  it("devuelve la crítica y el chequeo ATS", async () => {
    const cv = await db().cVVersion.create({
      data: { userId: USER_A, label: "Base", content: "Ana Pérez React" },
    });
    aiMock.queue = [{ ok: true, text: "LO QUE FUNCIONA: ..." }];
    const res = await analyzeCv(cv.id);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.text).toContain("LO QUE FUNCIONA");
    expect(res.ats.readable).toBe(false); // texto corto
  });

  it("no analiza CVs ajenos", async () => {
    const cv = await db().cVVersion.create({
      data: { userId: USER_B, label: "Ajeno", content: "x" },
    });
    expect((await analyzeCv(cv.id)).ok).toBe(false);
  });
});
