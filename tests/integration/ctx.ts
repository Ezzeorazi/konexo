import type { PrismaClient } from "@/lib/generated/prisma/client";

// Contexto compartido de los tests de integración. Vive en globalThis para que
// las factories de vi.mock (que están hoisteadas y no pueden cerrar sobre
// variables de módulo) puedan leerlo. setup.ts lo inicializa por archivo.
export type TestCtx = { prisma: PrismaClient; user: string };

declare global {
  var __testCtx__: TestCtx | undefined;
}

export const USER_A = "user-a";
export const USER_B = "user-b";

export function ctx(): TestCtx {
  if (!globalThis.__testCtx__) {
    throw new Error("Contexto de test no inicializado (¿falta el setup?).");
  }
  return globalThis.__testCtx__;
}

/** Cliente Prisma (sobre PGlite) para sembrar datos y asertar directo. */
export function db(): PrismaClient {
  return ctx().prisma;
}

/** Cambia el usuario que devolverá currentUserId() (para probar multi-tenancy). */
export function setUser(id: string): void {
  ctx().user = id;
}
