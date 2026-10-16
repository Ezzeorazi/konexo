import { test, expect, devices, type Page } from "@playwright/test";
import { resetDb } from "./db";

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

// Un CV real pegado: largo, multilínea y con caracteres de PDF copiado.
const CV_TEXT = Array.from(
  { length: 60 },
  (_, i) => `• Experiencia ${i + 1}: lideré el proyecto “Konexo” — React/Next.js, +30% conversión.`
).join("\n");

test("crear una versión de CV con texto largo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/configuracion");

  const dialog = await openDialog(page, /^Nueva$/);
  await dialog.getByLabel("Etiqueta *").fill("CV Frontend 2026");
  await dialog.getByLabel("Nombre de archivo").fill("cv.pdf");
  await dialog.getByLabel("Contenido del CV (texto)").fill(CV_TEXT);
  await dialog.getByLabel("Notas").fill("Para roles de producto");
  // El diálogo tiene que seguir abierto mientras se completa.
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Crear" }).click();

  await expect(page.getByText("Versión de CV creada.")).toBeVisible();
  await expect(page.getByText("CV Frontend 2026")).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("en celular", () => {
  const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
  void _ignored;
  test.use(pixel);

  test("crear una versión de CV desde el celu", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/configuracion");

    const dialog = await openDialog(page, /^Nueva$/);
    await dialog.getByLabel("Etiqueta *").tap();
    await dialog.getByLabel("Etiqueta *").fill("CV Mobile");
    await dialog.getByLabel("Contenido del CV (texto)").tap();
    await dialog.getByLabel("Contenido del CV (texto)").fill(CV_TEXT);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Crear" }).tap();

    await expect(page.getByText("Versión de CV creada.")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test("el diálogo no se cierra si un campo de Configuración se guarda al abrirlo", async ({ page }) => {
  await page.goto("/configuracion");
  // Dejar un campo de perfil en edición: al abrir el diálogo pierde el foco,
  // se guarda y la página se refresca.
  await expect(async () => {
    await page.getByRole("button", { name: "Editar qué vendés" }).click();
    await expect(page.getByRole("textbox", { name: "Editar qué vendés" })).toBeVisible({
      timeout: 1500,
    });
  }).toPass({ timeout: 30_000 });
  await page.getByRole("textbox", { name: "Editar qué vendés" }).fill("Dev full-stack");

  const dialog = await openDialog(page, /^Nueva$/);
  await dialog.getByLabel("Etiqueta *").fill("CV tras guardar");
  await page.waitForTimeout(3000); // dar tiempo al guardado + refresh
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Etiqueta *")).toHaveValue("CV tras guardar");
});

test("subir un PDF real completa el texto y muestra el chequeo ATS", async ({ page }) => {
  await page.goto("/configuracion");
  const dialog = await openDialog(page, /^Nueva$/);
  await dialog.getByLabel("Etiqueta *").fill("CV desde PDF");
  await dialog.getByLabel("Subir PDF del CV").setInputFiles("tests/fixtures/cv-texto.pdf");

  await expect(dialog.getByLabel("Contenido del CV (texto)")).toHaveValue(/ana\.perez@mail\.com/, {
    timeout: 20_000,
  });
  await expect(dialog.getByLabel("Nombre de archivo")).toHaveValue("cv-texto.pdf");
  await expect(dialog.getByText(/Legible para un ATS/)).toBeVisible();
  await dialog.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByText("Versión de CV creada.")).toBeVisible();
});

test("un PDF escaneado avisa que un ATS no lo puede leer", async ({ page }) => {
  await page.goto("/configuracion");
  const dialog = await openDialog(page, /^Nueva$/);
  await dialog.getByLabel("Subir PDF del CV").setInputFiles("tests/fixtures/cv-escaneado.pdf");
  await expect(dialog.getByText(/escaneado/)).toBeVisible({ timeout: 20_000 });
  await expect(dialog).toBeVisible();
});
