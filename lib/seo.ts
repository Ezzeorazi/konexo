import type { Metadata } from "next";

// Helper de metadata por página (auditoría / Tarea 6). Next mergea `openGraph`
// de forma SHALLOW: si una página define openGraph, reemplaza por completo el del
// layout (perdería og:image, siteName, locale). Este helper arma un openGraph
// completo con canonical y og:url propios por ruta, así cada página pública tiene
// sus propios tags en vez de heredar los del home.

const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "Konexo" };

export function pageMetadata(opts: {
  /** Ruta canónica y og:url, ej. "/guia". Relativa a metadataBase. */
  path: string;
  title: string;
  description: string;
  /** Si difieren del title/description para las tarjetas sociales. */
  ogTitle?: string;
  ogDescription?: string;
  /** "website" (default) o "article". */
  ogType?: "website" | "article";
}): Metadata {
  const { path, title, description } = opts;
  const ogTitle = opts.ogTitle ?? title;
  const ogDescription = opts.ogDescription ?? description;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: opts.ogType ?? "website",
      siteName: "Konexo",
      locale: "es_AR",
      url: path,
      title: ogTitle,
      description: ogDescription,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [OG_IMAGE.url],
    },
  };
}
