import { test, expect } from "@playwright/test";
import { query, resetDb, seedOpportunity } from "./db";

// Fase 4: la card de entrevista abre el simulacro como un MODO del chat. En E2E
// no hay proveedor de IA, así que verificamos el cableado de la UI y que un
// error de la IA no rompa nada.
test.beforeEach(async () => {
  await resetDb();
});

test("el simulacro abre el chat en modo entrevista y al salir vuelve al chat normal", async ({ page }) => {
  await seedOpportunity("op1", "Frontend en Acme", { stage: "INTERVIEW" });
  await query(`UPDATE "Opportunity" SET "jobDescription" = $1 WHERE id = 'op1'`, [
    "Buscamos React + TypeScript.",
  ]);

  await page.goto("/oportunidades/op1");
  const card = page.locator("#entrevista");
  await expect(card).toBeVisible();

  await card.getByRole("radio", { name: "Técnica" }).click();
  await expect(async () => {
    await card.getByRole("button", { name: /Simulacro \(Técnica\)/ }).click();
    await expect(page.getByText("Simulacro · Técnica")).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });

  await expect(page.getByText("Frontend en Acme").last()).toBeVisible();
  await expect(page.getByPlaceholder("Tu respuesta...")).toBeVisible();

  // Sin IA configurada el entrevistador falla: se avisa y el modo sigue usable.
  await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByText("Simulacro · Técnica")).toHaveCount(0);
  await expect(page.getByPlaceholder("Escribí tu consulta...")).toBeVisible();
});
