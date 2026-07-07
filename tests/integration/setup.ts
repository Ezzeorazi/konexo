import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@/lib/generated/prisma/client";

// --- Mocks (hoisteados al tope del archivo por vitest) ----------------------
// La app usa un singleton `prisma` apuntado a Neon y a Clerk. Acá lo redirigimos
// a una PGlite en memoria y a un usuario controlable, y neutralizamos los
// efectos de red (revalidatePath de Next, analítica de PostHog, Clerk backend).
// Las factories leen globalThis.__testCtx__ porque no pueden cerrar sobre
// variables de módulo (están hoisteadas).

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return globalThis.__testCtx__!.prisma;
  },
}));

vi.mock("@/lib/auth", () => ({
  currentUserId: async () => globalThis.__testCtx__!.user,
  clerkEnabled: () => false,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(async () => {}),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: null }),
  clerkClient: async () => ({ users: { deleteUser: vi.fn(async () => {}) } }),
}));

// --- Ciclo de vida ----------------------------------------------------------

const TABLES = [
  '"Company"',
  '"Opportunity"',
  '"Contact"',
  '"Touchpoint"',
  '"CVVersion"',
  '"WaitlistSignup"',
  '"Setting"',
  '"ProjectTask"',
  '"UserProgress"',
  '"AiUsage"',
  '"PipelineStage"',
];

let pg: PGlite;

beforeAll(async () => {
  const ddl = readFileSync(
    path.join(process.cwd(), "tests/integration/.schema.sql"),
    "utf8"
  );
  pg = new PGlite();
  await pg.exec(ddl);
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) });
  globalThis.__testCtx__ = { prisma, user: "user-a" };
});

beforeEach(async () => {
  await pg.exec(`TRUNCATE ${TABLES.join(",")} RESTART IDENTITY CASCADE;`);
  globalThis.__testCtx__!.user = "user-a";
  vi.clearAllMocks();
});

afterAll(async () => {
  await globalThis.__testCtx__?.prisma.$disconnect();
  await pg?.close();
  globalThis.__testCtx__ = undefined;
});
