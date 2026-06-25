// Proxy de Next.js 16 (antes "middleware"). Clerk recomienda este nombre de
// archivo en Next 16+; la implementación es idéntica a middleware.ts.
//
// Protege todas las rutas de la app y deja públicas la landing, las páginas por
// vertical y el login. En dev local sin keys de Clerk, el proxy es un passthrough
// y la app corre con el usuario-dev (ver lib/auth.ts).
//
// FAIL-CLOSED en producción (auditoría H1): en prod SIEMPRE exigimos Clerk. Si
// faltara CLERK_SECRET_KEY, clerkMiddleware falla y la app no sirve nada, en vez
// de quedar abierta con passthrough. El passthrough solo existe para dev local.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/home",
  "/para(.*)",
  "/guia",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/waitlist",
]);

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const proxy = process.env.CLERK_SECRET_KEY || IS_PRODUCTION
  ? clerkMiddleware(async (auth, req) => {
      // Puerta de calle: el visitante anónimo en "/" ve la landing, no el login.
      // El usuario logueado en "/" sigue viendo su dashboard.
      if (req.nextUrl.pathname === "/") {
        const { userId } = await auth();
        if (!userId) {
          return NextResponse.redirect(new URL("/home", req.url));
        }
      }
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export default proxy;

export const config = {
  matcher: [
    // Salta internals de Next y archivos estáticos
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre corre para API
    "/(api|trpc)(.*)",
  ],
};
