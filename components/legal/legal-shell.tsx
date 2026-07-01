import Image from "next/image";
import Link from "next/link";

// Marco compartido de las páginas legales (privacidad, términos). Mantiene el
// look comic del resto del sitio y deja el contenido en un contenedor legible.
// Es un Server Component: solo maqueta, sin estado.
export function LegalShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="halftone min-h-screen bg-paper font-hand text-ink selection:bg-komic selection:text-ink">
      {/* NAV */}
      <nav className="sticky top-0 z-50 halftone border-b-4 border-ink bg-paper">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/home" className="shrink-0">
            <Image
              src="/logotipo-konexo.webp"
              alt="Konexo"
              width={853}
              height={226}
              priority
              className="h-7 w-auto sm:h-9"
            />
          </Link>
          <Link
            href="/sign-up"
            className="btn-comic rough bg-komic px-3 py-1.5 font-display text-base tracking-wider sm:px-4 sm:text-lg"
          >
            ¡EMPIEZA YA!
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-8">
          <div className="mb-3 inline-block -rotate-2 bg-ink px-3 py-1 font-display text-sm tracking-widest text-paper sm:text-base">
            {eyebrow}
          </div>
          <h1 className="stroke-ink font-display text-4xl leading-[0.95] tracking-wide text-komic sm:text-6xl">
            {title}
          </h1>
          <p className="mt-3 text-base text-ink/70">
            Última actualización: {updated}
          </p>
        </header>

        {/* El contenido legal usa tamaños de texto neutros para leerse bien */}
        <article className="legal-prose space-y-6 text-[15px] leading-relaxed sm:text-base">
          {children}
        </article>

        <footer className="mt-14 border-t-4 border-ink pt-6 text-sm text-ink/70">
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-display tracking-wide">
            <Link href="/home" className="hover:text-alarm hover:underline">
              Inicio
            </Link>
            <Link href="/guia" className="hover:text-alarm hover:underline">
              Guía de uso
            </Link>
            <Link href="/privacidad" className="hover:text-alarm hover:underline">
              Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-alarm hover:underline">
              Términos
            </Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} Konexo · konexo.site</p>
        </footer>
      </div>
    </main>
  );
}

// Bloques reutilizables para el cuerpo legal.
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-2xl tracking-wide text-ink sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}
