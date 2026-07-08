import { defineConfig, devices } from "@playwright/test";

// Fase 4: E2E + accesibilidad. La app corre en `next dev` contra una PGlite
// expuesta por TCP (tests/e2e/db-server.mjs), SIN Clerk (usuario-dev) para no
// depender del login. Los tests siembran/resetean la misma base por TCP
// (tests/e2e/db.ts). Un solo worker: la base y el usuario-dev son compartidos.

const DB_URL = "postgresql://postgres:postgres@127.0.0.1:5433/postgres";

// Entorno del server de Next para E2E. Poner las keys de Clerk/PostHog en ""
// las deja "definidas pero vacías": Next no las pisa con las del .env, y la app
// cae al modo usuario-dev (ver app/layout.tsx y proxy.ts).
const nextEnv: Record<string, string> = {
  DATABASE_URL: DB_URL,
  DIRECT_URL: DB_URL,
  CLERK_SECRET_KEY: "",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
  POSTHOG_API_KEY: "",
  NEXT_PUBLIC_POSTHOG_KEY: "",
  SETTINGS_ENCRYPTION_KEY:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  // En CI reintentamos: la primera visita a una ruta la compila `next dev`
  // on-demand, y en un runner cargado ese compile en frío + el scan de axe de la
  // página más pesada (/dashboard) puede pasarse del timeout. El reintento pega
  // contra la ruta ya compilada y pasa. Local sin retries para ver fallos reales.
  retries: process.env.CI ? 2 : 0,
  // Colchón para el compile en frío bajo carga (antes 60s, se quedaba corto).
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    // localhost (no 127.0.0.1): Next 16 dev bloquea recursos (HMR, chunks) de
    // orígenes no confiables, y 127.0.0.1 no lo es por defecto → sin ese cambio
    // la app no hidrata y nada interactivo funciona.
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "node tests/e2e/db-server.mjs",
      url: "http://127.0.0.1:5434",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npx next dev --port 3100",
      url: "http://localhost:3100/home",
      reuseExistingServer: false,
      timeout: 180_000,
      env: nextEnv,
    },
  ],
});
