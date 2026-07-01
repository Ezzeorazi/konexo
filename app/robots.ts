import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://konexo.site";

// Se sirve en /robots.txt (ruta pública, ver proxy.ts). Deja indexar lo público
// y bloquea el área privada de la app (igual redirige al login).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/oportunidades",
          "/empresas",
          "/contactos",
          "/calendario",
          "/configuracion",
          "/asistente",
          "/api/",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
