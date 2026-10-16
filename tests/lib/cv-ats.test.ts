import { describe, it, expect } from "vitest";
import { atsCheck, cleanExtractedText } from "@/lib/cv-ats";
import { parseTailorSections } from "@/lib/cv-prompts";

const GOOD = [
  "Ana Pérez",
  "ana.perez@mail.com · +54 9 11 5555-5555",
  "Experiencia",
  "Frontend Developer en Acme SA (2019-2023). Lideré la migración a Next.js y bajé el tiempo de carga un 40% para 2 millones de usuarios.",
  "Educación",
  "Lic. en Sistemas, UBA (2014-2019).",
  "Skills",
  "React, TypeScript, Next.js, Node, Postgres, testing con Vitest y Playwright.",
].join("\n");

describe("atsCheck", () => {
  it("un CV limpio es legible y sin avisos", () => {
    const r = atsCheck(GOOD);
    expect(r.readable).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("casi sin texto = escaneado: error y corta", () => {
    const r = atsCheck("   \n  ");
    expect(r.readable).toBe(false);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].message).toMatch(/escaneado/);
  });

  it("sin email es error; sin teléfono, aviso", () => {
    const r = atsCheck(GOOD.replace(/ana\.perez@mail\.com/, "").replace(/\+54 9 11 5555-5555/, ""));
    expect(r.readable).toBe(false);
    expect(r.issues.find((i) => /email/.test(i.message))?.level).toBe("error");
    expect(r.issues.find((i) => /teléfono/.test(i.message))?.level).toBe("warn");
  });

  it("detecta símbolos rotos y fechas con guion largo", () => {
    const r = atsCheck(GOOD.replace("(2019-2023)", "(2019–2023)") + " ��(cid:12)(cid:13)");
    expect(r.issues.some((i) => /no se pudieron leer/.test(i.message))).toBe(true);
    expect(r.issues.some((i) => /guion largo/.test(i.message))).toBe(true);
  });

  it("avisa si no hay secciones estándar", () => {
    const r = atsCheck(
      "ana@mail.com +54 9 11 5555-5555\n" + "Hice muchas cosas lindas en varios lugares. ".repeat(10)
    );
    expect(r.issues.some((i) => /secciones/.test(i.message))).toBe(true);
  });
});

describe("teléfono", () => {
  it("no confunde rangos de años con un teléfono", () => {
    const sinTel = GOOD.replace(/\+54 9 11 5555-5555/, "");
    expect(atsCheck(sinTel).issues.some((i) => /teléfono/.test(i.message))).toBe(true);
    expect(atsCheck(GOOD.replace("+54 9 11 5555-5555", "(011) 4444-5555")).issues).toEqual([]);
  });
});

describe("cleanExtractedText", () => {
  it("colapsa espacios y saltos repetidos", () => {
    expect(cleanExtractedText("Hola   mundo \r\n\r\n\r\n\n  chau\t\t ")).toBe("Hola mundo\n\nchau");
  });
});

describe("parseTailorSections", () => {
  it("separa las tres secciones", () => {
    const s = parseTailorSections(
      "Intro que sobra\n===COBERTURA===\nReact | CUBIERTO\n===CV===\nAna Pérez\nBullets\n===CARTA===\nEstimados:"
    );
    expect(s).toEqual({
      coverage: "React | CUBIERTO",
      cv: "Ana Pérez\nBullets",
      letter: "Estimados:",
    });
  });

  it("tolera Markdown y espacios en los marcadores", () => {
    const s = parseTailorSections("**=== CV ===**\nTexto del CV\n## ===CARTA===\nCarta");
    expect(s?.cv).toBe("Texto del CV");
    expect(s?.letter).toBe("Carta");
    expect(s?.coverage).toBe("");
  });

  it("sin marcadores o sin CV devuelve null", () => {
    expect(parseTailorSections("solo texto")).toBeNull();
    expect(parseTailorSections("===CARTA===\nCarta")).toBeNull();
  });
});
