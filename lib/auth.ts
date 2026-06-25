import { auth } from "@clerk/nextjs/server";

// Seam de identidad. Punto único donde el resto de la app pregunta
// "¿quién es el usuario actual?". Todas las queries de datos lo usan para
// scopear filas: nunca se devuelve data de otro usuario.
//
// Degradación elegante SOLO en desarrollo: si Clerk no está configurado (dev
// local sin keys), usamos un usuario-dev para que la app siga funcionando.
// Apenas hay CLERK_SECRET_KEY, pasa a usar el userId real de la sesión.
//
// FAIL-CLOSED en producción: el fallback a usuario-dev NUNCA aplica en prod. Si
// falta CLERK_SECRET_KEY o no hay sesión, tiramos error en vez de degradar a un
// usuario compartido (que mezclaría los datos de todos). Ver auditoría H1.
//
// Ver [[fundeable-pivot]]: multi-tenancy + identidad real es el prerequisito de
// medir activación y retención (lo que vuelve a Konexo fundeable).

const DEV_USER_ID = "dev-user";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function clerkEnabled(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

export async function currentUserId(): Promise<string> {
  if (!clerkEnabled()) {
    // Sin Clerk en producción: fail-closed. No servimos datos con un usuario-dev
    // compartido. Es una mala configuración del entorno, no un caso de uso.
    if (IS_PRODUCTION) {
      throw new Error(
        "Auth no configurada: falta CLERK_SECRET_KEY en producción. Se aborta para no exponer datos."
      );
    }
    // Solo dev local: usuario-dev para poder trabajar sin keys.
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
