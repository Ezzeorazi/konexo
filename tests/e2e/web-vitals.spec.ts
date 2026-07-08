import { test, expect, type Page } from "@playwright/test";
import { resetDb, seedCompany, seedOpportunity, seedContact } from "./db";

// Web Vitals de las páginas clave. CLS (estabilidad de layout) es estable entre
// dev y prod, así que lo exigimos en el rango "bueno" (< 0.1): protege contra
// saltos por carga de fuentes/imágenes del tema cómic.
//
// LCP en `next dev` (localhost) NO representa producción; lo dejamos como smoke
// muy holgado para atrapar sólo regresiones groseras. Para medir LCP real hay
// que correr Lighthouse contra un build de producción / preview.
const CLS_BUDGET = 0.1;
const LCP_SMOKE_MS = 5000;

const PAGES = ["/home", "/dashboard", "/oportunidades"];

async function measureVitals(page: Page, path: string) {
  // En dev la 1ª navegación compila la ruta; medimos la 2ª (en caliente).
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => {});

  return page.evaluate(async () => {
    const cls = await new Promise<number>((resolve) => {
      let sum = 0;
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!e.hadRecentInput) sum += e.value;
        }
      });
      obs.observe({ type: "layout-shift", buffered: true });
      setTimeout(() => {
        obs.disconnect();
        resolve(sum);
      }, 1500);
    });
    const lcp = await new Promise<number>((resolve) => {
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (last) resolve(Math.round(last.startTime));
      });
      obs.observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => resolve(0), 1500);
    });
    return { cls, lcp };
  });
}

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
  test(`web vitals de ${path}`, async ({ page }) => {
    const { cls, lcp } = await measureVitals(page, path);
    expect(cls, `CLS de ${path} = ${cls}`).toBeLessThan(CLS_BUDGET);
    expect(lcp, `LCP de ${path} = ${lcp}ms (smoke dev)`).toBeLessThan(LCP_SMOKE_MS);
  });
}
