import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Fase 2: tests de integración de server actions + rutas API contra una base
// Postgres REAL en proceso (PGlite, WASM), sin mockear Prisma. Cada archivo abre
// su propia base en memoria (ver tests/integration/setup.ts); el DDL se genera
// una vez desde el schema (global-setup.ts).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: true,
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      // Clave AES válida (hex de 64 chars) para ejercitar el cifrado at-rest de
      // secretos igual que en prod (lib/crypto.ts).
      SETTINGS_ENCRYPTION_KEY:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      // Tope bajo para tests rápidos de rate limit (lib/ai-usage.ts).
      AI_DAILY_LIMIT: "5",
    },
  },
});
