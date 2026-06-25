import { auth } from "@clerk/nextjs/server";

// Seam de identidad. Punto único donde el resto de la app pregunta
// "¿quién es el usuario actual?". Todas las queries de datos lo usan para
// scopear filas: nunca se devuelve data de otro usuario.
//
// Degradación elegante: si Clerk no está configurado (dev local sin keys),
// usamos un usuario-dev para que la app siga funcionando. Apenas hay
// CLERK_SECRET_KEY, pasa a usar el userId real de la sesión, sin tocar nada más.
//
// Ver [[fundeable-pivot]]: multi-tenancy + identidad real es el prerequisito de
// medir activación y retención (lo que vuelve a Konexo fundeable).

const DEV_USER_ID = "dev-user";

export function clerkEnabled(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

export async function currentUserId(): Promise<string> {
  if (!clerkEnabled()) {
    return process.env.DEV_USER_ID ?? DEV_USER_ID;
  }
  const { userId } = await auth();
  if (!userId) {
    // El proxy ya protege las rutas de la app; si llegamos acá sin sesión,
    // es un error de programación (acción llamada desde una ruta pública).
    throw new Error("No autenticado.");
  }
  return userId;
}
