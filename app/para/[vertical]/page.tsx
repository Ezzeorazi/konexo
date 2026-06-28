import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getLanding, LANDING_SLUGS } from "@/lib/landings";
import { getVocab, getStages, stageTile } from "@/lib/tracks";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return LANDING_SLUGS.map((vertical) => ({ vertical }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string }>;
}): Promise<Metadata> {
  const { vertical } = await params;
  const landing = getLanding(vertical);
  if (!landing) return { title: "Konexo" };
  const vocab = getVocab(landing.track);
  const title = `Konexo para ${vocab.name} — ${landing.headline.join(" ")}`;
  return {
    title,
    description: landing.sub,
    openGraph: { title, description: landing.sub },
  };
}

export default async function VerticalLandingPage({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const { vertical } = await params;
  const landing = getLanding(vertical);
  if (!landing) notFound();

  const vocab = getVocab(landing.track);
  const stages = getStages(landing.track);
  const live = vocab.status === "live";

  return (
    <main className="font-hand text-ink overflow-x-hidden bg-paper selection:bg-komic selection:text-ink">
      {/* ===== NAV ===== */}
      <nav className="sticky top-0 z-50 border-b-4 border-ink bg-paper halftone">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/home" className="shrink-0">
            <Image
              src="/logotipo-konexo.webp"
              alt="Konexo"
              width={853}
              height={226}
              priority
              className="h-8 w-auto md:h-10"
            />
          </Link>
          <Link
            href="/sign-up"
            className="btn-comic rough bg-komic px-4 py-1.5 font-display text-lg tracking-wider md:text-xl"
          >
            ¡EMPIEZA YA!
          </Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header className="relative halftone speedlines overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-24 pt-14 md:grid-cols-12 md:pb-28 md:pt-20">
          <div className="relative z-10 md:col-span-7">
            <div className="mb-5 inline-block -rotate-2 bg-ink px-4 py-1 font-display text-lg tracking-widest text-paper md:text-xl">
              {vocab.emoji} KONEXO PARA {vocab.name.toUpperCase()}
            </div>
            <h1 className="stroke-ink font-display text-6xl leading-[0.92] tracking-wide text-komic md:text-8xl">
              {landing.headline.map((line, i) => (
                <span key={i} className={i === landing.headline.length - 1 ? "text-alarm" : undefined}>
                  {line}
                  <br />
                </span>
              ))}
            </h1>
            <p className="mt-7 max-w-xl text-2xl leading-snug md:text-3xl">
              {landing.sub}
            </p>
            <p className="mt-3 font-display tracking-wide text-lg text-ink/70">
              {landing.audience}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/sign-up"
                className="btn-comic rough bg-alarm px-7 py-3 font-display text-2xl tracking-wider text-paper md:text-3xl"
              >
                {live ? "¡EMPEZAR GRATIS!" : "PROBAR LA BETA"}
              </Link>
              <Link
                href="/home"
                className="btn-comic rough-2 bg-panelw px-7 py-3 font-display text-2xl tracking-wider md:text-3xl"
              >
                VER TODO
              </Link>
            </div>
            <p className="mt-5 font-display text-lg tracking-wide text-ink/70">
              🦾 GRATIS PARA EMPEZAR · SIN TARJETA · TUS DATOS, PRIVADOS
            </p>
          </div>

          {/* pipeline preview con las etapas reales del vertical */}
          <div className="relative md:col-span-5">
            <div className="panel rough panel-tilt-r p-5">
              <div className="mb-3 flex items-center justify-between border-b-[3px] border-ink pb-2">
                <span className="font-display text-xl tracking-wide">
                  {vocab.oppPlural.toUpperCase()}
                </span>
                <span
                  className={cn(
                    "rotate-2 border-2 border-ink px-2 py-0.5 font-display text-sm",
                    live ? "bg-hero text-paper" : "bg-komic text-ink"
                  )}
                >
                  {live ? "LIVE" : "BETA"}
                </span>
              </div>
              <div className="space-y-2">
                {stages.map((stage, i) => {
                  const t = stageTile(landing.track, stage.key);
                  return (
                    <div
                      key={stage.key}
                      className={cn(
                        "flex items-center justify-between border-[3px] border-ink px-3 py-1.5 font-display tracking-wide",
                        t.bar,
                        t.text,
                        i % 2 === 0 ? "rotate-[-0.6deg]" : "rotate-[0.6deg]"
                      )}
                    >
                      <span>{stage.label.toUpperCase()}</span>
                      <ArrowRight className="size-4 opacity-70" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 bg-ink py-1.5 text-center font-display tracking-widest text-komic">
                EL EMBUDO DE {vocab.oppPlural.toUpperCase()}
                <span className="cursor-blink">▌</span>
              </div>
            </div>
            <div className="burst burst-shadow halftone-yellow float-bob absolute -right-2 -top-10 z-20 flex h-28 w-28 bg-komic md:-right-6 md:h-36 md:w-36">
              <span className="stroke-thin rotate-[-8deg] font-display text-3xl text-alarm md:text-4xl">
                ¡POW!
              </span>
            </div>
          </div>
        </div>
        <div className="torn"></div>
      </header>

      {/* ===== PROBLEMA ===== */}
      <section className="halftone-red bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="stroke-ink mb-12 text-center font-display text-5xl text-alarm md:text-7xl">
            EL VILLANO: EL CAOS
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {landing.pains.map((pain, i) => (
              <div
                key={pain.title}
                className={cn(
                  "panel panel-hover p-6",
                  i === 1 ? "rough-2" : "rough"
                )}
                style={{ ["--tilt" as string]: i === 1 ? "0deg" : i === 0 ? "-1.2deg" : "1.1deg" }}
              >
                <div className="mb-4 text-center text-6xl">{pain.emoji}</div>
                <h3 className="mb-2 font-display text-3xl tracking-wide">{pain.title}</h3>
                <p className="text-xl leading-snug">{pain.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="torn"></div>
      </section>

      {/* ===== SOLUCIÓN / PODERES ===== */}
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2
            className="stroke-thin mb-12 text-center font-display text-5xl text-komic md:text-7xl"
            style={{ textShadow: "5px 5px 0 #E2493B" }}
          >
            KONEXO AL RESCATE
          </h2>
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
            <div className="panel rough p-6">
              <h3 className="mb-2 font-display text-3xl tracking-wide text-alarm">PIPELINE VISUAL</h3>
              <p className="text-xl leading-snug">
                Arrastrá cada {vocab.oppSingular} por las etapas: {stages.map((s) => s.label).join(" → ")}. Un vistazo y sabés dónde está todo.
              </p>
            </div>
            <div className="panel rough-2 p-6">
              <h3 className="mb-2 font-display text-3xl tracking-wide text-hero">RECORDATORIOS QUE GOLPEAN</h3>
              <p className="text-xl leading-snug">
                Follow-ups y fechas clave, con un calendario que sincronizás al teléfono. Konexo te avisa antes de que el villano del olvido ataque tu mejor oportunidad.
              </p>
            </div>
            <div className="panel rough-2 p-6">
              <h3 className="mb-2 font-display text-3xl tracking-wide">EXPEDIENTE COMPLETO</h3>
              <p className="text-xl leading-snug">
                Qué hablaste, con quién, qué mandaste{vocab.hasValue ? ", qué monto" : ""}. Todo el contexto de cada {vocab.companySingular} y contacto en un lugar.
              </p>
            </div>
            <div className="panel rough p-6">
              <h3 className="mb-2 font-display text-3xl tracking-wide text-alarm">IA DE TU LADO</h3>
              <p className="text-xl leading-snug">
                Te resume el estado, te pone al día y decide próximos pasos; y si lo pedís, redacta tus mensajes. Con tu propia API key o con Ollama gratis y local: tus datos no salen de tu máquina.
              </p>
            </div>
          </div>
        </div>
        <div className="torn torn-flip" style={{ background: "#F2E8C9" }}></div>
      </section>

      {/* ===== CTA ===== */}
      <section className="halftone-red bg-alarm">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="burst burst-shadow halftone-yellow float-bob mx-auto mb-8 flex h-36 w-36 bg-komic">
            <span className="stroke-thin rotate-[-8deg] font-display text-3xl text-alarm">
              {live ? "¡GRATIS!" : "BETA"}
            </span>
          </div>
          <h2 className="stroke-ink mb-6 font-display text-5xl leading-[0.95] text-paper md:text-7xl">
            {landing.ctaKicker.toUpperCase()}
          </h2>
          <Link
            href="/sign-up"
            className="btn-comic rough inline-block bg-komic px-10 py-4 font-display text-3xl tracking-wider text-ink md:text-4xl"
          >
            ¡EMPEZAR CON KONEXO! →
          </Link>
          <p className="mt-6 text-xl text-paper/90">
            Sin tarjeta. Sin spam. Tus datos, privados.
          </p>
          {!live ? (
            <p className="mt-2 font-display tracking-wide text-paper/80">
              Este preset está en beta — el motor ya corre, lo estamos puliendo para tu rubro.
            </p>
          ) : null}
        </div>
        <div className="torn"></div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 md:flex-row">
          <span className="font-display text-3xl tracking-wider">
            KONE<span className="text-alarm">X</span>O
          </span>
          <p className="font-hand text-lg text-paper/70">
            El CRM personal de tus relaciones que importan · © 2026
          </p>
          <div className="flex flex-wrap gap-4 font-display text-base tracking-wide">
            <Link href="/guia" className="hover:text-komic">
              GUÍA
            </Link>
            {LANDING_SLUGS.map((slug) => (
              <Link key={slug} href={`/para/${slug}`} className="hover:text-komic">
                {slug.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
