import { test, expect } from "@playwright/test";
import { resetDb, seedOpportunity } from "./db";

// Un proyecto PROPIO (kind="own", modo "Tu negocio") no tiene cliente al que
// reunir: el follow-up es un recordatorio personal, no una reunión. El de
// CLIENTE sí lidera con "reunión". Verifica que la card superior se adapta.

test.beforeEach(async () => {
  await resetDb();
  await seedOpportunity("own1", "Mi proyecto propio", { track: "freelance", kind: "own" });
  await seedOpportunity("cli1", "Proyecto de cliente", { track: "freelance", kind: "client" });
});

test("proyecto propio: la card lidera con 'PRÓXIMO PENDIENTE' y sin 'Registrar reunión'", async ({ page }) => {
  await page.goto("/oportunidades/own1");
  await expect(page.getByText("PRÓXIMO PENDIENTE")).toBeVisible();
  await expect(page.getByText("PRÓXIMA REUNIÓN / FOLLOW-UP")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrar reunión" })).toHaveCount(0);
  // La opción sigue disponible en el touchpoint genérico.
  await expect(page.getByRole("button", { name: "Registrar touchpoint" })).toBeVisible();
});

test("proyecto de cliente: la card lidera con 'REUNIÓN' y ofrece 'Registrar reunión'", async ({ page }) => {
  await page.goto("/oportunidades/cli1");
  await expect(page.getByText("PRÓXIMA REUNIÓN / FOLLOW-UP")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar reunión" })).toBeVisible();
});
