import type { PostFaq } from "@/lib/blog";

// Sección de preguntas frecuentes reutilizable (home, blog, posts).
// - Usa <details>/<summary> nativo: funciona sin JS y es accesible.
// - Emite JSON-LD FAQPage para que Google muestre rich results.
// El JSON-LD inline pasa la CSP porque script-src incluye 'unsafe-inline'.
export function Faq({
  items,
  title = "Preguntas frecuentes",
  eyebrow,
  dark = false,
}: {
  items: PostFaq[];
  title?: string;
  eyebrow?: string;
  dark?: boolean;
}) {
  if (!items || items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section className={dark ? "text-paper" : "text-ink"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {eyebrow ? (
        <div className="inline-block -rotate-2 bg-ink px-3 py-1 font-display text-sm tracking-widest text-paper">
          {eyebrow}
        </div>
      ) : null}
      <h2
        className={
          "stroke-ink mt-3 font-display text-3xl tracking-wide sm:text-5xl " +
          (dark ? "text-komic" : "text-ink")
        }
      >
        {title}
      </h2>

      <div className="mt-6 space-y-3">
        {items.map((it, i) => (
          <details
            key={i}
            className="panel rough group bg-panelw p-0 text-ink [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-display text-lg tracking-wide sm:text-xl">
              {it.q}
              <span className="shrink-0 font-display text-2xl transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="border-t-[3px] border-ink/15 px-5 py-4 text-base leading-relaxed text-ink/85 sm:text-lg">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
