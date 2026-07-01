import type { MetadataRoute } from "next";

// Web App Manifest de Konexo. Next 16 lo sirve en /manifest.webmanifest, ruta
// ya excluida del proxy (ver matcher en proxy.ts), así que es pública sin login.
//
// Base para instalar Konexo como PWA y empaquetarla en una TWA para la Play
// Store (Bubblewrap / PWABuilder). start_url apunta al dashboard: la app abre
// directo en el CRM; si no hay sesión, Clerk redirige a /sign-in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Konexo — CRM de relaciones",
    short_name: "Konexo",
    description:
      "CRM personal para manejar oportunidades, contactos y follow-ups con seguimiento, no con una planilla.",
    lang: "es",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f2e8c9", // paper (splash)
    theme_color: "#16110c", // ink (barra de estado Android)
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
