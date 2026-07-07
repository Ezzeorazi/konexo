import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Suite de tests. Fase 1: unit de lógica pura (sin DB, sin DOM), por eso
// environment "node". Las fases de integración (server actions contra Postgres)
// y E2E (Playwright) se agregan aparte cuando lleguen.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Solo los tests unitarios de lógica pura. La integración vive en
    // tests/integration/ y corre con vitest.integration.config.ts (necesita
    // PGlite + setup). node_modules trae cientos de *.test.ts que no son nuestros.
    include: ["tests/lib/**/*.test.ts"],
    globals: true,
  },
});
