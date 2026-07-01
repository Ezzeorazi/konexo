import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Estilos globales de los elementos que genera el MDX del blog. Se mapean a
// componentes de marca (comic/hand) pero priorizando la legibilidad de un
// artículo largo. Requerido por @next/mdx en App Router.
const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="stroke-thin mt-2 font-display text-4xl leading-tight tracking-wide text-ink sm:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 font-display text-3xl tracking-wide text-ink">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 font-display text-2xl tracking-wide text-ink">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-lg leading-relaxed text-ink/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-lg text-ink/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-lg text-ink/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => {
    const url = String(href ?? "");
    const external = /^https?:\/\//.test(url);
    const className =
      "font-medium text-hero underline decoration-2 underline-offset-2 hover:text-alarm";
    return external ? (
      <a href={url} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    ) : (
      <Link href={url} className={className}>
        {children}
      </Link>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="panel rough my-6 bg-panelw p-5 font-hand text-xl text-ink">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-lg border-[3px] border-ink bg-ink p-4 font-mono text-sm text-paper">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-t-4 border-ink/20" />,
  img: (props) => (
    // Imágenes embebidas dentro del cuerpo del post (viven en /public).
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      {...props}
      className="my-6 w-full rounded-lg border-[3px] border-ink shadow-[5px_5px_0_var(--color-ink)]"
    />
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
