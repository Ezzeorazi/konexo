import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  KanbanSquare,
  BellRing,
  FolderOpen,
  Sparkles,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { Faq } from "@/components/faq";
import { ScrollToTop } from "@/components/scroll-to-top";
import { clerkEnabled } from "@/lib/auth";
import { KONEXO_FAQ } from "@/lib/faq";
import { pageMetadata } from "@/lib/seo";

// Frases del marquee (banda negra). Se repiten en dos mitades idénticas para
// que el scroll sea infinito y sin huecos (ver más abajo).
const MARQUEE = [
  "¡ZAS! PIPELINE ORGANIZADO",
  "¡BAM! FOLLOW-UPS A TIEMPO",
  "¡POW! TODO BAJO CONTROL",
];
// Cada "mitad" repite las frases lo suficiente para superar el ancho de la
// pantalla; con la animación -50% las dos mitades hacen un loop sin salto.
const MARQUEE_HALF = Array.from({ length: 4 }, () => MARQUEE).flat();

export const metadata: Metadata = pageMetadata({
  path: "/home",
  title: "Konexo — Organizá tu búsqueda de empleo como un pipeline",
  description:
    "Konexo organiza tu búsqueda laboral, ventas o freelance como un pipeline: oportunidades, contactos y follow-ups panel por panel. IA incluida. Gratis para empezar, en web y como app Android.",
});

// Landing nativa (React/Tailwind), responsive mobile-first. Reemplaza el iframe
// del HTML estático: mejor SEO, links reales a legales/guía/instalación y un
// solo lugar para mantener. Es un Server Component (sin estado ni JS de cliente).

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://konexo.site";

// Datos estructurados del sitio (Organization + WebSite + la app) para SEO.
const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "Konexo",
      url: SITE,
      logo: `${SITE}/icon-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: "Konexo",
      url: SITE,
      inLanguage: "es-AR",
      publisher: { "@id": `${SITE}/#org` },
    },
    {
      "@type": "SoftwareApplication",
      name: "Konexo",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android",
      url: SITE,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

const MODOS = [
  {
    emoji: "🎯",
    name: "Buscadores de empleo",
    body: "Postulaciones, entrevistas y referidos. Guardada → Aplicada → Entrevista → Oferta. Que ninguna chance se te escape.",
  },
  {
    emoji: "💰",
    name: "Ventas",
    body: "Prospecto → Contactado → Propuesta → Negociación → Cerrado. Montos y seguimientos para cerrar más.",
  },
  {
    emoji: "🧑‍💻",
    name: "Freelancers",
    body: "Clientes, propuestas y cobros. Que ningún proyecto se enfríe ni ninguna factura se olvide.",
  },
  {
    emoji: "🏠",
    name: "Inmobiliarias",
    body: "Prospecto → visita → oferta → escritura. Cada propiedad y cada cliente, con su pipeline.",
  },
  {
    emoji: "🚀",
    name: "Startups",
    body: "Lead → Pitch → Due diligence → Term sheet → Cerrado. Tu ronda de fundraising bajo control.",
  },
  {
    emoji: "🧲",
    name: "Reclutadores",
    body: "Sourcing → Screening → Entrevista → Oferta → Contratado. Sin perder a nadie en el camino.",
  },
];

const VILLANOS = [
  {
    emoji: "📊💥",
    title: "El Excel mutante",
    body: "47 filas, 12 colores, cero idea de en qué quedó cada contacto. Tu planilla ya tiene vida propia… y no está de tu lado.",
  },
  {
    emoji: "👻📧",
    title: "El ghosting silencioso",
    body: "“Te escribimos pronto”… hace 3 semanas. Sin recordatorios, el follow-up que pudo cerrar todo nunca salió de tu cabeza.",
  },
  {
    emoji: "🤯📅",
    title: "La reunión sorpresa",
    body: "¿Qué empresa era? ¿Qué le mandaste? ¿Quién decide? Llegar sin contexto es entrar al ring sin guantes.",
  },
];

const PODERES = [
  {
    icon: KanbanSquare,
    tag: "¡ZAS!",
    title: "Pipeline visual",
    body: "Arrastrá cada oportunidad por etapas. Un vistazo y sabés dónde está cada pelea — y cuál está por cerrar.",
  },
  {
    icon: BellRing,
    tag: "¡RING!",
    title: "Recordatorios que golpean",
    body: "Follow-ups, reuniones, deadlines. Konexo te avisa antes de que el villano del olvido ataque tu mejor oportunidad.",
  },
  {
    icon: FolderOpen,
    tag: "¡CLIC!",
    title: "Expediente por contacto",
    body: "Qué hablaste, con quién, qué mandaste, qué monto. Toda la historia de cada empresa, persona y oportunidad en un solo lugar.",
  },
  {
    icon: Sparkles,
    tag: "¡BAM!",
    title: "IA de tu lado",
    body: "Adaptá tu CV o tu propuesta a cada oportunidad con un clic. Ya viene activada: no configurás nada para empezar.",
  },
];

const ACTOS = [
  {
    n: "1",
    title: "Elegí tu modo y cargá",
    body: "Activá empleo, ventas o ambos en Configuración. Cargá la oportunidad —empresa, contacto, monto— y entrá a tu tablero en 30 segundos.",
  },
  {
    n: "2",
    title: "Avanzá panel por panel",
    body: "Mové cada proceso por el pipeline, anotá cada contacto y dejá que los recordatorios hagan su trabajo.",
  },
  {
    n: "3",
    title: "Cerrá con datos",
    body: "Llegás a cada reunión con contexto completo y cerrás con datos, no con corazonadas. Fin del episodio… e inicio del próximo.",
  },
];

export default async function HomePage() {
  // Sesión: si el visitante ya está logueado, los CTA de "entrar/empezar"
  // pasan a "ir a la plataforma" (al dashboard).
  const { userId } = clerkEnabled() ? await auth() : { userId: null };
  const isSignedIn = Boolean(userId);
  return (
    <main className="halftone min-h-screen overflow-x-hidden bg-paper font-hand text-ink selection:bg-komic selection:text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
      />
      {/* ===== NAV ===== */}
      <nav className="sticky top-0 z-50 halftone border-b-4 border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
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
          <div className="hidden items-center gap-7 font-display text-lg tracking-wide md:flex lg:text-xl">
            <a href="#modos" className="hover:text-alarm">
              MODOS
            </a>
            <a href="#poderes" className="hover:text-alarm">
              PODERES
            </a>
            <a href="#ia" className="hover:text-alarm">
              IA
            </a>
            <a href="#app" className="hover:text-alarm">
              APP
            </a>
            <Link href="/blog" className="hover:text-alarm">
              BLOG
            </Link>
            <Link href="/guia" className="hover:text-alarm">
              GUÍA
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="btn-comic rough bg-komic px-4 py-2 font-display text-lg tracking-wider sm:text-xl"
              >
                MI PLATAFORMA →
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden font-display text-lg tracking-wide hover:text-alarm sm:inline"
                >
                  ENTRAR
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-comic rough bg-komic px-4 py-2 font-display text-lg tracking-wider sm:text-xl"
                >
                  ¡EMPIEZA YA!
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <div className="mb-4 inline-block -rotate-2 bg-ink px-3 py-1 font-display text-xs tracking-widest text-paper sm:text-sm">
            TU BÚSQUEDA DE EMPLEO · NIVEL HÉROE
          </div>
          <h1 className="stroke-ink font-display text-5xl leading-[0.9] tracking-wide text-komic sm:text-7xl">
            TU BÚSQUEDA DE EMPLEO,{" "}
            <span className="text-alarm">NIVEL HÉROE.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-snug sm:text-2xl">
            Postulaciones, entrevistas y referidos en un plan de ataque panel
            por panel. Konexo te dice <b>a quién seguir y cuándo</b> — nunca más
            se te escapa un follow-up.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-up"}
              className="btn-comic rough bg-komic px-6 py-3 font-display text-xl tracking-wider sm:text-2xl"
            >
              {isSignedIn ? "IR A MI PLATAFORMA →" : "¡QUIERO ENTRAR!"}
            </Link>
            <Link
              href="/guia"
              className="font-display text-base tracking-wide underline decoration-2 underline-offset-4 hover:text-alarm sm:text-lg"
            >
              Cómo funciona →
            </Link>
          </div>
          <p className="mt-4 font-display text-xs tracking-widest text-ink/60 sm:text-sm">
            SIN TARJETA · GRATIS PARA EMPEZAR · WEB Y APP ANDROID
          </p>
        </div>

        {/* Tarjeta de muestra del pipeline */}
        <div className="panel rough panel-tilt-r p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between font-display tracking-wide">
            <span className="rounded-md border-2 border-ink bg-komic px-2 py-0.5 text-sm">
              🎯 EMPLEO
            </span>
            <span className="flex items-center gap-1 text-xs text-alarm">
              <span className="size-2 rounded-full bg-alarm" /> LIVE
            </span>
          </div>
          <div className="space-y-3">
            {[
              { col: "PROSPECTO", item: "Frontend Sr. · TechMex" },
              { col: "EN JUEGO", item: "Entrevista ⚡ Jueves 10am" },
              { col: "CIERRE", item: "Oferta 💰 ¡A negociar!" },
            ].map((c) => (
              <div
                key={c.col}
                className="rounded-md border-[3px] border-ink bg-panelw px-3 py-2"
              >
                <p className="font-display text-[11px] tracking-widest text-ink/60">
                  {c.col}
                </p>
                <p className="text-base">{c.item}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 font-display text-xs tracking-wide text-ink/70">
            12 EN JUEGO · 3 ESTA SEMANA · 1 POR CERRAR ▌
          </p>
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      {/* Loop infinito sin huecos: dos mitades IDÉNTICAS, cada una repetida lo
          suficiente para pasar el ancho de pantalla; la animación mueve -50%
          (una mitad), así la segunda ocupa el lugar de la primera sin salto. */}
      <div className="overflow-hidden border-y-4 border-ink bg-ink py-2.5 text-paper">
        <div className="marquee-track flex w-max whitespace-nowrap font-display text-lg tracking-widest">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0" aria-hidden={half === 1}>
              {MARQUEE_HALF.map((t, i) => (
                <span key={i} className="mx-4 flex items-center gap-4">
                  {t} <span className="text-komic">★</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ===== MODOS ===== */}
      <section id="modos" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="stroke-ink font-display text-4xl tracking-wide text-hero sm:text-6xl">
            Y CRECE CON VOS
          </h2>
          <p className="mt-4 text-lg sm:text-xl">
            Empezás ordenando tu búsqueda de empleo. El día que arranques a
            vender, freelancear o levantar una ronda, el mismo motor ya está
            listo: solo cambiás de modo. <b>6 modos ya corren.</b>
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODOS.map((m) => (
            <div key={m.name} className="panel rough panel-hover h-full p-5">
              <div className="text-3xl">{m.emoji}</div>
              <h3 className="mt-2 font-display text-2xl tracking-wide">
                {m.name}
              </h3>
              <p className="mt-1.5 text-base text-ink/80">{m.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-base text-ink/70">
          ¿Tu misión no está en la lista? El motor es el mismo — escribinos y la
          sumamos.
        </p>
      </section>

      {/* ===== VILLANO ===== */}
      <section className="border-y-4 border-ink bg-panelw">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="mb-10 text-center">
            <div className="inline-block -rotate-1 bg-alarm px-4 py-1 font-display text-lg tracking-widest text-paper">
              EL VILLANO: EL CAOS
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-lg sm:text-xl">
              Perseguir trabajos, clientes o deals sin sistema es pelear contra
              un jefe final con los ojos vendados.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {VILLANOS.map((v) => (
              <div key={v.title} className="panel rough h-full bg-paper p-6">
                <div className="text-4xl">{v.emoji}</div>
                <h3 className="mt-3 font-display text-2xl tracking-wide text-alarm">
                  {v.title}
                </h3>
                <p className="mt-2 text-base text-ink/80">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PODERES ===== */}
      <section id="poderes" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="inline-block rotate-1 bg-komic px-4 py-1 font-display text-lg tracking-widest text-ink">
            ¡PERO ESPERÁ!
          </div>
          <h2 className="stroke-ink mt-3 font-display text-4xl tracking-wide text-komic sm:text-6xl">
            TUS NUEVOS PODERES
          </h2>
          <p className="mt-4 text-lg sm:text-xl">
            Konexo te equipa con todo el arsenal para cerrar tu próxima misión —
            sea cual sea.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {PODERES.map(({ icon: Icon, ...p }) => (
            <div key={p.title} className="panel rough panel-hover flex gap-4 p-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md border-[3px] border-ink bg-komic">
                <Icon className="size-6" />
              </div>
              <div>
                <p className="font-display text-sm tracking-widest text-alarm">
                  {p.tag}
                </p>
                <h3 className="font-display text-2xl tracking-wide">
                  {p.title}
                </h3>
                <p className="mt-1 text-base text-ink/80">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== IA INCLUIDA ===== */}
      <section id="ia" className="border-y-4 border-ink bg-ink text-paper">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center md:py-20">
          <div className="inline-block -rotate-2 bg-komic px-4 py-1 font-display text-sm tracking-widest text-ink">
            NUEVO PODER · GRATIS E INCLUIDO
          </div>
          <h2 className="stroke-ink mt-4 font-display text-4xl tracking-wide text-komic sm:text-6xl">
            IA YA ACTIVADA
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-paper/90 sm:text-xl">
            No es un chatbot que espera tus preguntas: es un equipo de agentes
            que trabaja tu embudo. Uno <b>califica</b> a quién contactar primero
            y otro <b>redacta</b> los borradores en tu tono. Vos revisás y
            enviás.
          </p>
          <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                t: "🧐 El Calificador",
                b: "Lee tu embudo real y lo ordena por prioridad: caliente, tibia o fría, con el motivo y el próximo paso.",
              },
              {
                t: "✍️ El Redactor",
                b: "Escribe los borradores de las más calientes en tu tono, listos para copiar y pegar. Nada se inventa.",
              },
              {
                t: "🔌 Sin configurar nada",
                b: "Konexo viene con IA lista para todos (Groq, en la nube). Si querés, podés poner tu propia key o correr Ollama local.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rough border-[3px] border-komic bg-paper/5 p-5"
              >
                <p className="font-display text-lg tracking-wide text-komic">
                  {c.t}
                </p>
                <p className="mt-1.5 text-base text-paper/85">{c.b}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-up"
              className="btn-comic rough bg-komic px-6 py-3 font-display text-lg tracking-wider text-ink"
            >
              ¡PONÉ EL EQUIPO A TRABAJAR! →
            </Link>
            <Link
              href="/guia"
              className="font-display text-base tracking-wide text-komic underline decoration-2 underline-offset-4 hover:text-paper"
            >
              Ver la guía completa →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== INSTALÁ LA APP ===== */}
      <section id="app" className="mx-auto max-w-5xl px-4 py-14 md:py-20">
        <div className="panel rough grid items-center gap-8 p-8 md:grid-cols-[1fr_auto] md:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border-[3px] border-ink bg-hero px-3 py-1 font-display text-sm tracking-widest text-paper">
              <Smartphone className="size-4" /> PRÓXIMAMENTE EN GOOGLE PLAY
            </div>
            <h2 className="stroke-ink mt-4 font-display text-4xl tracking-wide text-hero sm:text-5xl">
              LLEVALO EN EL BOLSILLO
            </h2>
            <p className="mt-3 max-w-xl text-lg text-ink/85">
              La app de Konexo para Android está <b>en camino a Google Play</b>.
              Mientras tanto, ya podés usar Konexo desde el navegador de tu
              celular e instalarlo en la pantalla de inicio (<b>Menú → Instalar
              app</b>), a pantalla completa como cualquier app.
            </p>
            <p className="mt-3 max-w-xl text-base text-ink/70">
              ¿Querés ayudar a que llegue a la tienda? Con un cafecito bancás la
              publicación en Google Play. ☕
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="btn-comic rough bg-komic px-5 py-2.5 font-display text-lg tracking-wider"
              >
                Empezar gratis
              </Link>
              <a
                href="#apoyar"
                className="inline-flex items-center gap-1 font-display text-base tracking-wide underline decoration-2 underline-offset-4 hover:text-alarm"
              >
                Bancá el lanzamiento <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
          <Image
            src="/icon-512.png"
            alt="App Konexo"
            width={512}
            height={512}
            className="float-bob mx-auto size-32 rounded-3xl border-[3px] border-ink shadow-[6px_6px_0_var(--color-ink)] sm:size-40"
          />
        </div>
      </section>

      {/* ===== 3 ACTOS ===== */}
      <section className="border-y-4 border-ink bg-panelw">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h2 className="stroke-ink mb-10 text-center font-display text-4xl tracking-wide text-komic sm:text-6xl">
            LA MISIÓN EN 3 ACTOS
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {ACTOS.map((a) => (
              <div key={a.n} className="panel rough h-full bg-paper p-6">
                <div className="flex size-12 items-center justify-center rounded-full border-[3px] border-ink bg-komic font-display text-2xl">
                  {a.n}
                </div>
                <h3 className="mt-3 font-display text-2xl tracking-wide">
                  {a.title}
                </h3>
                <p className="mt-2 text-base text-ink/80">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="border-t-4 border-ink bg-panelw">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
          <Faq items={KONEXO_FAQ} eyebrow="DUDAS" title="PREGUNTAS FRECUENTES" />
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
        <div className="inline-block -rotate-2 bg-alarm px-4 py-1 font-display text-lg tracking-widest text-paper">
          ¡GRATIS!
        </div>
        <h2 className="stroke-ink mt-4 font-display text-4xl leading-[0.95] tracking-wide text-komic sm:text-6xl">
          EL PRÓXIMO CAPÍTULO LO ESCRIBÍS VOS
        </h2>
        <p className="mt-4 text-lg sm:text-xl">
          Creá tu cuenta gratis y tomá el control de tu búsqueda hoy mismo.
        </p>
        <Link
          href={isSignedIn ? "/dashboard" : "/sign-up"}
          className="btn-comic rough mt-7 inline-block bg-komic px-8 py-4 font-display text-2xl tracking-wider sm:text-3xl"
        >
          {isSignedIn ? "IR A MI PLATAFORMA →" : "¡EMPEZAR CON KONEXO! →"}
        </Link>
        <p className="mt-4 font-display text-xs tracking-widest text-ink/60">
          SIN TARJETA · SIN SPAM · TUS DATOS, PRIVADOS
        </p>
      </section>

      {/* ===== APOYÁ EL PROYECTO ===== */}
      <section id="apoyar" className="border-t-4 border-ink bg-panelw">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center md:py-16">
          <div className="inline-block -rotate-2 bg-hero px-3 py-1 font-display text-sm tracking-widest text-paper">
            HECHO EN PÚBLICO
          </div>
          <h2 className="stroke-ink mt-4 font-display text-3xl tracking-wide text-hero sm:text-5xl">
            ¿TE SIRVE KONEXO?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink/85 sm:text-xl">
            Konexo es gratis y lo construyo solo, a pulmón. Si te suma,
            invitame un cafecito: ayudás a bancar el hosting, la app en Google
            Play y las próximas funciones.
          </p>
          <div className="mt-7 flex justify-center">
            {/* Botón oficial de Cafecito (imagen servida por su CDN). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a
              href="https://cafecito.app/konexo"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:-translate-y-0.5"
            >
              <img
                srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
                src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
                alt="Invitame un café en cafecito.app"
                className="h-14 w-auto"
              />
            </a>
          </div>
          <p className="mt-3 text-sm text-ink/60">
            Donación en pesos vía Mercado Pago. Sin compromiso, cuando quieras.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t-4 border-ink bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-3xl tracking-wider">
                KONE<span className="text-alarm">X</span>O
              </p>
              <p className="mt-1 text-sm text-paper/70">
                El CRM personal de las relaciones que importan.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 font-display text-sm tracking-wide">
              <a href="#apoyar" className="text-komic hover:text-alarm">
                ☕ APOYAR
              </a>
              <Link href="/blog" className="hover:text-komic">
                BLOG
              </Link>
              <Link href="/guia" className="hover:text-komic">
                GUÍA DE USO
              </Link>
              <Link href="/terminos" className="hover:text-komic">
                TÉRMINOS
              </Link>
              <Link href="/privacidad" className="hover:text-komic">
                PRIVACIDAD
              </Link>
              <a href="mailto:ezequiel.orazi90@gmail.com" className="hover:text-komic">
                CONTACTO
              </a>
            </nav>
          </div>
          <p className="mt-8 border-t border-paper/20 pt-6 text-xs text-paper/60">
            © {new Date().getFullYear()} Konexo · konexo.site · Desarrollado con
            🦾 por{" "}
            <a
              href="https://ezequiel-orazi.online"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-komic underline underline-offset-2 hover:text-alarm"
            >
              Ezequiel Orazi
            </a>
            .
          </p>
        </div>
      </footer>

      <ScrollToTop />
    </main>
  );
}
