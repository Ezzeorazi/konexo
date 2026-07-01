import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPostSlugs, getPostMeta } from "@/lib/blog";
import { Faq } from "@/components/faq";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://konexo.site";

// Prerenderiza todos los posts; 404 para slugs inexistentes.
export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}
export const dynamicParams = false;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getPostMeta(slug);
  if (!meta) return {};
  const url = `/blog/${slug}`;
  return {
    title: `${meta.title} — Konexo`,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: meta.title,
      description: meta.description,
      url,
      publishedTime: meta.date,
      authors: meta.author ? [meta.author] : undefined,
      images: meta.cover ? [{ url: meta.cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: meta.cover ? [meta.cover] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = await getPostMeta(slug);
  if (!meta) notFound();

  // El módulo MDX exporta el componente del post por default.
  const { default: Post } = await import(`@/content/blog/${slug}.mdx`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    dateModified: meta.date,
    author: { "@type": "Person", name: meta.author ?? "Konexo" },
    publisher: {
      "@type": "Organization",
      name: "Konexo",
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
    },
    image: meta.cover ? [`${SITE}${meta.cover}`] : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${slug}` },
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1 font-display text-sm tracking-wide text-ink/60 hover:text-alarm"
      >
        <ArrowLeft className="size-4" /> VOLVER AL BLOG
      </Link>

      <header className="mt-4">
        {meta.tags && meta.tags.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {meta.tags.map((t) => (
              <span
                key={t}
                className="rounded-md border-2 border-ink bg-komic px-2 py-0.5 font-display text-xs tracking-wide"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="stroke-thin font-display text-4xl leading-tight tracking-wide text-ink sm:text-5xl">
          {meta.title}
        </h1>
        <p className="mt-3 font-display text-xs tracking-widest text-ink/50">
          {formatDate(meta.date)}
          {meta.author ? ` · POR ${meta.author.toUpperCase()}` : ""}
        </p>
      </header>

      {meta.cover ? (
        <Image
          src={meta.cover}
          alt={meta.title}
          width={1200}
          height={630}
          priority
          className="mt-6 aspect-[1200/630] w-full rounded-lg border-[3px] border-ink object-cover shadow-[5px_5px_0_var(--color-ink)]"
        />
      ) : null}

      {/* Cuerpo MDX (usa los estilos de mdx-components.tsx) */}
      <article className="mt-8">
        <Post />
      </article>

      {/* FAQ del post (schema FAQPage) */}
      {meta.faq && meta.faq.length > 0 ? (
        <div className="mt-14 border-t-4 border-ink pt-10">
          <Faq items={meta.faq} title="Preguntas frecuentes" />
        </div>
      ) : null}

      {/* CTA */}
      <div className="panel rough mt-14 bg-komic p-6 text-center">
        <p className="font-display text-2xl tracking-wide text-ink">
          ¿Listo para organizar tu búsqueda?
        </p>
        <Link
          href="/sign-up"
          className="btn-comic rough mt-4 inline-block bg-paper px-6 py-2.5 font-display text-lg tracking-wider"
        >
          EMPEZAR GRATIS →
        </Link>
      </div>
    </main>
  );
}
