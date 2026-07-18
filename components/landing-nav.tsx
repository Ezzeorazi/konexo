"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// Navbar de la landing. En desktop: logo · links (BLOG/GUÍA) · CTA. En móvil:
// logo de un lado y hamburguesa del otro; el menú despliega los links + el CTA.
// El CTA es dinámico según sesión (lo resuelve el server y lo pasa por prop).

const LINKS = [
  { href: "/blog", label: "BLOG" },
  { href: "/guia", label: "GUÍA" },
];

export function LandingNav({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const cta = isSignedIn
    ? { href: "/dashboard", label: "MI PLATAFORMA →" }
    : { href: "/sign-up", label: "¡EMPIEZA YA!" };

  return (
    <nav className="sticky top-0 z-50 halftone border-b-4 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Image
            src="/logotipo-konexo.webp"
            alt="Konexo"
            width={853}
            height={226}
            priority
            className="h-8 w-auto sm:h-10"
          />
        </Link>

        {/* Links (desktop) */}
        <div className="hidden items-center gap-7 font-display text-lg tracking-wide md:flex lg:text-xl">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-alarm">
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA (desktop) */}
        <Link
          href={cta.href}
          className="btn-comic rough hidden bg-komic px-4 py-2 font-display text-lg tracking-wider sm:text-xl md:inline-block"
        >
          {cta.label}
        </Link>

        {/* Hamburguesa (móvil) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          className="flex size-10 items-center justify-center rounded-md border-[3px] border-ink bg-komic text-ink transition-transform active:translate-y-px md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Menú desplegable (móvil) */}
      {open ? (
        <div className="border-t-4 border-ink bg-paper md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 font-display text-lg tracking-wide">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 hover:bg-komic/40 hover:text-alarm"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="btn-comic rough mt-2 bg-komic px-4 py-2.5 text-center tracking-wider"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
