import { describe, it, expect } from "vitest";
import { normalizeUrl, parseMoney } from "@/lib/utils";

describe("normalizeUrl", () => {
  it("antepone https:// a un dominio pelado", () => {
    expect(normalizeUrl("axondigital.mx")).toBe("https://axondigital.mx");
  });

  it("respeta un esquema http:// ya presente", () => {
    expect(normalizeUrl("http://acme.com")).toBe("http://acme.com");
  });

  it("respeta un esquema https:// ya presente", () => {
    expect(normalizeUrl("https://acme.com/path?q=1")).toBe(
      "https://acme.com/path?q=1"
    );
  });

  it("respeta esquemas que incluyen :// (ftp, custom)", () => {
    expect(normalizeUrl("ftp://files.example.com")).toBe(
      "ftp://files.example.com"
    );
  });

  it("prefija esquemas sin // (mailto) porque no matchean el patrón ://", () => {
    // El patrón exige '://', así que "mailto:" no cuenta como esquema. Es el
    // comportamiento buscado: acá solo entran webs/LinkedIn, no mailtos.
    expect(normalizeUrl("mailto:a@b.com")).toBe("https://mailto:a@b.com");
  });

  it("recorta espacios antes de normalizar", () => {
    expect(normalizeUrl("  acme.com  ")).toBe("https://acme.com");
  });

  it("devuelve null para vacío, solo espacios o undefined", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
    expect(normalizeUrl(undefined)).toBeNull();
  });

  it("no confunde una ruta con esquema (no tiene ://)", () => {
    // "localhost:3000" no matchea el patrón de esquema (falta //), se prefija.
    expect(normalizeUrl("localhost:3000")).toBe("https://localhost:3000");
  });
});

describe("parseMoney", () => {
  it("parsea un número simple", () => {
    expect(parseMoney("1500")).toBe(1500);
  });

  it("interpreta la coma como decimal (formato AR sin miles)", () => {
    expect(parseMoney("1500,50")).toBe(1500.5);
  });

  it("interpreta el punto como decimal (formato US sin miles)", () => {
    expect(parseMoney("1500.50")).toBe(1500.5);
  });

  it("maneja separador de miles + decimal (AR: punto miles, coma decimal)", () => {
    expect(parseMoney("1.500,50")).toBe(1500.5);
    expect(parseMoney("1.234.567,89")).toBe(1234567.89);
  });

  it("maneja separador de miles + decimal (US: coma miles, punto decimal)", () => {
    expect(parseMoney("1,500.50")).toBe(1500.5);
    expect(parseMoney("1,234,567.89")).toBe(1234567.89);
  });

  it("trata un separador repetido como miles (sin decimal)", () => {
    expect(parseMoney("1.500.000")).toBe(1500000);
    expect(parseMoney("1,500,000")).toBe(1500000);
  });

  it("ignora símbolos de moneda y espacios", () => {
    expect(parseMoney("$ 2500")).toBe(2500);
    expect(parseMoney("USD 3.000,50")).toBe(3000.5);
  });

  it("[ambigüedad documentada] un único separador con 3 dígitos se toma como decimal", () => {
    // "1.500" es ambiguo (1.5 o 1500). Sin locale, lo tratamos como decimal,
    // igual que antes del fix: no empeora nada. Para 1500 se usa "1500" o "1.500,00".
    expect(parseMoney("1.500")).toBe(1.5);
  });

  it("respeta el signo negativo", () => {
    expect(parseMoney("-1500,50")).toBe(-1500.5);
  });

  it("devuelve null para vacío, null, undefined o sin dígitos", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("$")).toBeNull();
  });
});
