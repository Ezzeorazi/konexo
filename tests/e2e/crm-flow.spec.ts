import { test, expect, type Page } from "@playwright/test";
import { resetDb, seedCompany, seedOpportunity, seedContact } from "./db";

// Flujos de trabajo reales, manejando la UI como un usuario. Cada test arranca
// con la base vacía.
test.beforeEach(async () => {
  await resetDb();
});

// Abre un diálogo con reintento: en `next dev` el componente cliente puede no
// estar hidratado cuando llega el primer click. Usamos el rol "dialog" del Popup
// (Base UI) como señal de apertura y sólo clickeamos si todavía no está abierto
// (para no togglearlo cerrado). Devuelve el locator del diálogo abierto.
async function openDialog(page: Page, triggerName: RegExp) {
  const trigger = page.getByRole("button", { name: triggerName }).first();
  // La página puede tener varios <Dialog> (header + estado vacío); nos quedamos
  // con el que esté visible (el que se abrió).
  const dialog = page.getByRole("dialog").filter({ visible: true });
  await expect(async () => {
    if ((await dialog.count()) === 0) await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  return dialog;
}

test("crear una empresa desde el diálogo la muestra en la tabla", async ({ page }) => {
  await page.goto("/empresas");
  const dialog = await openDialog(page, /Nueva empresa/i);
  await dialog.getByLabel(/Nombre/).fill("Mercado Libre");
  await dialog.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("cell", { name: "Mercado Libre" })).toBeVisible();
});

test("crear un contacto desde el diálogo lo muestra en la lista", async ({ page }) => {
  await page.goto("/contactos");
  const dialog = await openDialog(page, /Nuevo contacto/i);
  await dialog.getByLabel(/Nombre/).fill("Ana Pérez");
  await dialog.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Ana Pérez")).toBeVisible();
});

test("crear una oportunidad la muestra en el tablero", async ({ page }) => {
  await page.goto("/oportunidades");
  const dialog = await openDialog(page, /Nueva oportunidad/i);
  await dialog.getByLabel(/Título/).fill("Backend en Acme");
  await dialog.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Backend en Acme")).toBeVisible();
});

test("el dashboard lista los follow-ups próximos de oportunidades y contactos", async ({ page }) => {
  await seedCompany("co1", "Acme SA");
  await seedOpportunity("op1", "Seguir a Acme", {
    companyId: "co1",
    stage: "APPLIED",
    nextFollowUpAt: new Date(), // dentro de los próximos 14 días
  });
  await seedContact("ct1", "Ana Pérez", {
    companyId: "co1",
    nextFollowUpAt: new Date(),
  });

  await page.goto("/dashboard");

  // El panel "PRÓXIMOS FOLLOW-UPS" muestra ambos.
  await expect(page.getByText("Seguir a Acme")).toBeVisible();
  await expect(page.getByText("Ana Pérez")).toBeVisible();
});

test("una oportunidad sin contacto en su empresa aparece en 'SIN CONTACTO'", async ({ page }) => {
  await seedCompany("co1", "Empresa Sola");
  await seedOpportunity("op1", "Oportunidad huérfana", { companyId: "co1", stage: "SAVED" });

  await page.goto("/dashboard");
  const panel = page.locator("section, div").filter({ hasText: "SIN CONTACTO" }).first();
  await expect(panel).toContainText("Oportunidad huérfana");
});
