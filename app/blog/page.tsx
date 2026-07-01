import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { Faq } from "@/components/faq";
import { KONEXO_FAQ } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Blog de Konexo — Búsqueda de empleo, ventas y follow-ups",
  description:
    "Guías y consejos prácticos para organizar tu búsqueda de empleo, tus ventas o tu trabajo freelance como un pipeline: seguimiento, contactos y productividad.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Blog de Konexo",
    description:
      "Guías prácticas para organizar tu búsqueda de empleo, ventas y follow-ups.",
    url: "/blog",
  },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <header className="mb-10">
        <div className="mb-3 inline-block -rotate-2 bg-ink px-3 py-1 font-display text-sm tracking-widest text-paper">
          EL BLOG
        </div>
        <h1 className="stroke-ink font-display text-5xl tracking-wide text-komic sm:text-7xl">
          NOTAS DEL HÉROE
        </h1>
        <p className="mt-4 max-w-2xl text-xl leading-snug">
          Guías y tácticas para organizar tu búsqueda de empleo, tus ventas o tu
          trabajo freelance como un pipeline — y que ningún follow-up se te
          escape.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="panel rough bg-panelw p-6 text-lg">
          Todavía no hay posts publicados. ¡Pronto!
        </p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <article key={post.slug} className="panel rough panel-hover overflow-hidden bg-panelw p-0">
              <Link href={`/blog/${post.slug}`} className="block">
                {post.cover ? (
                  <Image
                    src={post.cover}
                    alt={post.title}
                    width={1200}
                    height={630}
                    className="aspect-[1200/630] w-full border-b-[3px] border-ink object-cover"
                  />
                ) : null}
                <div className="p-5">
                  {post.tags && post.tags.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {post.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-md border-2 border-ink bg-komic px-2 py-0.5 font-display text-xs tracking-wide"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <h2 className="font-display text-2xl leading-tight tracking-wide text-ink">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-base text-ink/80">{post.description}</p>
                  <p className="mt-3 font-display text-xs tracking-widest text-ink/50">
                    {formatDate(post.date)}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* FAQ general de Konexo (schema FAQPage) */}
      <div className="mt-16">
        <Faq items={KONEXO_FAQ} eyebrow="DUDAS" title="PREGUNTAS FRECUENTES" />
      </div>
    </main>
  );
}
