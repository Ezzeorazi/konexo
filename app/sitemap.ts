import type { MetadataRoute } from "next";
import { LANDING_SLUGS } from "@/lib/landings";
import { getAllPosts } from "@/lib/blog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://konexo.site";

// Se sirve en /sitemap.xml (ruta pública, ver proxy.ts). Incluye páginas
// públicas fijas, las landings por vertical y los posts del blog.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE}/home`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/guia`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const verticalEntries: MetadataRoute.Sitemap = LANDING_SLUGS.map((slug) => ({
    url: `${SITE}/para/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const posts = await getAllPosts();
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(`${p.date}T00:00:00`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...verticalEntries, ...postEntries];
}
