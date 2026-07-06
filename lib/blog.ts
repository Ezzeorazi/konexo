import fs from "node:fs";
import path from "node:path";

// Blog basado en archivos MDX en content/blog/*.mdx. Cada post exporta un
// `metadata` (ver el tipo abajo). El índice y el sitemap se arman leyendo esos
// metadatos. Todo corre server-side (usa fs).

export type PostFaq = { q: string; a: string };

export type PostMeta = {
  title: string;
  description: string;
  /** ISO corto, ej. "2026-07-01". Ordena y alimenta el sitemap. */
  date: string;
  author?: string;
  /** Ruta pública de la portada, ej. "/blog/mi-post.webp". */
  cover?: string;
  tags?: string[];
  /** Preguntas frecuentes del post → schema FAQPage (rich results). */
  faq?: PostFaq[];
  /** Si es true, NO se lista en el índice ni en el sitemap, pero la URL
   * /blog/<slug> sigue viva (se sigue generando y renderizando). Se usa para
   * posts de modos retirados: se despublican del índice pero se conservan por
   * SEO/enlaces existentes. */
  unlisted?: boolean;
};

export type Post = PostMeta & { slug: string };

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** Slugs de todos los posts (nombre de archivo sin .mdx). */
export function getPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

/** Metadata de un post (importa el módulo MDX para leer su export). */
export async function getPostMeta(slug: string): Promise<PostMeta | null> {
  try {
    const mod = await import(`@/content/blog/${slug}.mdx`);
    return (mod.metadata as PostMeta) ?? null;
  } catch {
    return null;
  }
}

/** Todos los posts con su slug, ordenados por fecha (más nuevo primero). */
export async function getAllPosts(): Promise<Post[]> {
  const slugs = getPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const meta = await getPostMeta(slug);
      return meta ? ({ slug, ...meta } as Post) : null;
    })
  );
  return posts
    .filter((p): p is Post => p !== null)
    .filter((p) => !p.unlisted) // los despublicados quedan fuera del índice/sitemap
    .sort((a, b) => b.date.localeCompare(a.date));
}
