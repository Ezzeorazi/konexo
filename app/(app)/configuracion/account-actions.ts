"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { currentUserId, clerkEnabled } from "@/lib/auth";

// Eliminación de cuenta (auditoría / Tarea 5 · requisito de Google Play).
//
// Borra en cascada TODOS los datos del tenant en Postgres y elimina el usuario
// en Clerk vía Backend API. Requiere que el usuario escriba "ELIMINAR" como
// confirmación explícita (lo valida también el server, no solo el front).
//
// Es irreversible: el front ofrece exportar el JSON antes (reusa /api/export).

const CONFIRM_WORD = "ELIMINAR";

export async function deleteAccount(
  confirmation: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (confirmation?.trim().toUpperCase() !== CONFIRM_WORD) {
    return {
      ok: false,
      error: `Escribí "${CONFIRM_WORD}" para confirmar la eliminación.`,
    };
  }

  const userId = await currentUserId();

  // Borrado de datos primero (lo importante para la privacidad). Orden que
  // respeta las FKs: hijos antes que padres. Todo scopeado por userId.
  await prisma.$transaction([
    prisma.touchpoint.deleteMany({ where: { userId } }),
    prisma.projectNote.deleteMany({ where: { userId } }),
    prisma.projectTask.deleteMany({ where: { userId } }),
    prisma.opportunity.deleteMany({ where: { userId } }),
    prisma.contact.deleteMany({ where: { userId } }),
    prisma.company.deleteMany({ where: { userId } }),
    prisma.cVVersion.deleteMany({ where: { userId } }),
    prisma.pipelineStage.deleteMany({ where: { userId } }),
    prisma.setting.deleteMany({ where: { userId } }),
    prisma.userProgress.deleteMany({ where: { userId } }),
    prisma.aiUsage.deleteMany({ where: { userId } }),
  ]);

  // Elimina el usuario en Clerk. Solo si Clerk está activo (en dev local no hay
  // usuario real). Si fallara, los datos ya se borraron: no revertimos.
  if (clerkEnabled()) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    } catch {
      // La cuenta de Clerk podría requerir borrado manual, pero los datos del
      // CRM ya no existen. No exponemos el error crudo al usuario.
      return {
        ok: false,
        error:
          "Tus datos se eliminaron, pero hubo un problema al cerrar la cuenta de acceso. Escribinos para terminar de borrarla.",
      };
    }
  }

  return { ok: true };
}
