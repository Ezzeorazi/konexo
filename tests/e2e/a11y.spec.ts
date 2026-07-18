import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resetDb, seedCompany, seedOpportunity, seedContact } from "./db";

// Contrato de accesibilidad. Corremos axe (WCAG 2.0 A/AA) sobre cada página del
// área privada + la landing, con datos sembrados para que rendericen de verdad.
//
// Exigimos CERO violaciones, con dos excepciones DOCUMENTADAS como tradeoffs
// aceptados del diseño actual:
//  - color-contrast: el tema "cómic" usa combinaciones de bajo contraste a
//    propósito (amarillo/rojo sobre papel). Es una decisión de marca; mejorarlo
//    es un rediseño, no un bug puntual.
//  - nested-interactive: las cards del kanban son "draggables" (dnd-kit, role
//    button) que contienen un link al detalle. Es inherente al drag & drop.
//
// Cualquier OTRA violación (labels faltantes, botones sin nombre, etc.) rompe el
// test: así el fix de accesibilidad de /configuración no se puede regresar.
const ALLOWED_RULES = new Set(["color-contrast", "nested-interactive"]);

const PAGES = [
  "/",
  "/dashboard",
  "/oportunidades",
  "/contactos",
  "/empresas",
  "/calendario",
  "/configuracion",
];

test.beforeAll(async () => {
  await resetDb();
  await seedCompany("co1", "Acme SA");
  await seedOpportunity("op1", "Backend en Acme", {
    companyId: "co1",
    stage: "APPLIED",
    nextFollowUpAt: new Date(),
  });
  await seedContact("ct1", "Ana Pérez", { companyId: "co1", nextFollowUpAt: new Date() });
});

for (const path of PAGES) {
  test(`sin violaciones de accesibilidad inesperadas en ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => {});

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    // Ninguna violación crítica, pase lo que pase con las excepciones.
    const critical = violations.filter((v) => v.impact === "critical");
    expect(critical, `Críticas en ${path}: ${critical.map((v) => v.id).join(", ")}`).toEqual([]);

    // Ninguna violación fuera de la lista de tradeoffs documentados.
    const unexpected = violations.filter((v) => !ALLOWED_RULES.has(v.id));
    expect(
      unexpected,
      `Inesperadas en ${path}: ${unexpected.map((v) => `${v.impact}:${v.id}`).join(", ")}`
    ).toEqual([]);
  });
}
