import { test, expect, type Page } from "@playwright/test";
import { resetDb, seedCompany, seedContact } from "./db";

// Notas en empresa y contacto: el flujo de "creé una empresa y un contacto y
// quiero dejarle una nota".
test.beforeEach(async () => {
  await resetDb();
});

async function openDialog(page: Page, triggerName: RegExp) {
  const trigger = page.getByRole("button", { name: triggerName }).first();
  const dialog = page.getByRole("dialog").filter({ visible: true });
  await expect(async () => {
    if ((await dialog.count()) === 0) await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  return dialog;
}

test("registrar una nota (touchpoint) desde el contacto", async ({ page }) => {
  await seedCompany("co1", "Acme SA");
  await seedContact("ct1", "Ana Pérez", { companyId: "co1" });
  await page.goto("/contactos/ct1");

  const dialog = await openDialog(page, /Registrar touchpoint/i);
  await dialog.getByLabel("Nota").fill("Le escribí por LinkedIn");
  await dialog.getByRole("button", { name: "Registrar" }).click();

  await expect(page.getByText("Touchpoint registrado.")).toBeVisible();
  await expect(page.getByText("Le escribí por LinkedIn")).toBeVisible();
});

test("editar las notas del contacto", async ({ page }) => {
  await seedCompany("co1", "Acme SA");
  await seedContact("ct1", "Ana Pérez", { companyId: "co1" });
  await page.goto("/contactos/ct1");

  await expect(async () => {
    await page.getByRole("button", { name: "Editar notas" }).click();
    await expect(page.getByRole("textbox", { name: "Editar notas" })).toBeVisible({
      timeout: 1500,
    });
  }).toPass({ timeout: 30_000 });
  const box = page.getByRole("textbox", { name: "Editar notas" });
  await box.fill("Conocida de la facu");
  await box.blur();
  // Esperar a que termine el guardado (el botón pierde data-saving).
  const btn = page.getByRole("button", { name: "Editar notas" });
  await expect(btn).toBeVisible();
  await expect(btn).not.toHaveAttribute("data-saving", /.*/, { timeout: 15_000 });
  await page.reload();
  await expect(page.getByText("Conocida de la facu")).toBeVisible();
});

test("editar las notas de la empresa", async ({ page }) => {
  await seedCompany("co1", "Acme SA");
  await page.goto("/empresas/co1");

  await expect(async () => {
    await page.getByRole("button", { name: "Editar notas" }).click();
    await expect(page.getByRole("textbox", { name: "Editar notas" })).toBeVisible({
      timeout: 1500,
    });
  }).toPass({ timeout: 30_000 });
  const box = page.getByRole("textbox", { name: "Editar notas" });
  await box.fill("Buena cultura según Glassdoor");
  await box.blur();
  // Esperar a que termine el guardado (el botón pierde data-saving).
  const btn = page.getByRole("button", { name: "Editar notas" });
  await expect(btn).toBeVisible();
  await expect(btn).not.toHaveAttribute("data-saving", /.*/, { timeout: 15_000 });
  await page.reload();
  await expect(page.getByText("Buena cultura según Glassdoor")).toBeVisible();
});
