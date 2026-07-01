import Image from "next/image";
import Link from "next/link";
import { ScrollToTop } from "@/components/scroll-to-top";

// Layout compartido del blog: mismo look comic que la landing/legales.
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="halftone min-h-screen bg-paper font-hand text-ink selection:bg-komic selection:text-ink">
      {/* NAV */}
      <nav className="sticky top-0 z-50 halftone border-b-4 border-ink bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/home" className="shrink-0">
            <Image
              src="/logotipo-konexo.webp"
              alt="Konexo"
              width={853}
              height={226}
              priority
              className="h-8 w-auto sm:h-10"
            />
          </Link>
          <div className="flex items-center gap-4 font-display text-base tracking-wide sm:gap-6 sm:text-lg">
            <Link href="/blog" className="hover:text-alarm">
              BLOG
            </Link>
            <Link href="/guia" className="hidden hover:text-alarm sm:inline">
              GUÍA
            </Link>
            <Link
              href="/sign-up"
              className="btn-comic rough bg-komic px-3 py-1.5 font-display tracking-wider sm:px-4"
            >
              ¡EMPIEZA YA!
            </Link>
          </div>
        </div>
      </nav>

      {children}

      {/* FOOTER */}
      <footer className="border-t-4 border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center">
          <p className="font-display text-2xl tracking-wider">
            KONE<span className="text-alarm">X</span>O
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-display text-sm tracking-wide">
            <Link href="/home" className="hover:text-komic">
              INICIO
            </Link>
            <Link href="/blog" className="hover:text-komic">
              BLOG
            </Link>
            <Link href="/guia" className="hover:text-komic">
              GUÍA
            </Link>
            <Link href="/terminos" className="hover:text-komic">
              TÉRMINOS
            </Link>
            <Link href="/privacidad" className="hover:text-komic">
              PRIVACIDAD
            </Link>
          </nav>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
