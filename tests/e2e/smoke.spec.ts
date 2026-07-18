import { test, expect } from "@playwright/test";
import { resetDb } from "./db";

test.beforeEach(async () => {
  await resetDb();
});

test("la landing pública carga", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Konexo/i);
});

test("el dashboard carga con el usuario-dev (sin Clerk)", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /CENTRO DE/i })).toBeVisible();
});

test("el tablero de oportunidades carga vacío", async ({ page }) => {
  await page.goto("/oportunidades");
  // La página respondió 200 y renderizó (no es el error de Next).
  await expect(page.locator("body")).not.toContainText("Application error");
});
