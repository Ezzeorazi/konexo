import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía de uso — Konexo",
  description:
    "Cómo usar Konexo de punta a punta: oportunidades, contactos, follow-ups, el tablero, los modos, la IA y la configuración.",
};

// Página pública (ver proxy.ts). Vive fuera del grupo (app), así no lleva el
// sidebar ni requiere login: cualquiera puede leer la guía.

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "que-es",
    title: "1 · Qué es Konexo",
    body: (
      <>
        <p>
          Konexo es un <b>CRM personal</b>: te ayuda a manejar cualquier proceso
          que se gane con <b>relaciones y seguimiento</b>, no con una planilla.
          Nació para la <b>búsqueda de empleo</b> (postulaciones, entrevistas y
          referidos) y el mismo motor sirve para ventas, freelance,
          inmobiliarias, fundraising o reclutamiento.
        </p>
        <p>
          La idea central: cada <b>oportunidad</b> vive conectada a las{" "}
          <b>personas</b> que pueden destrabarla y a cada <b>interacción</b> que
          tuviste con ellas. Así sabés siempre <b>a quién seguir y cuándo</b>.
        </p>
      </>
    ),
  },
  {
    id: "primeros-pasos",
    title: "2 · Primeros pasos",
    body: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          <b>Creá tu cuenta</b> gratis (con email o Google). Tus datos quedan
          privados, separados de los de cualquier otro usuario.
        </li>
        <li>
          Entrás al <b>Dashboard</b>: tu centro de misiones con los follow-ups
          pendientes y el estado del embudo.
        </li>
        <li>
          Elegí <b>para qué</b> usás Konexo en{" "}
          <b>Configuración → ¿Para qué usás Konexo?</b> (empleo viene activo por
          defecto; podés sumar más modos).
        </li>
        <li>
          Cargá tu <b>primera oportunidad</b> y registrá un{" "}
          <b>follow-up</b>. ¡Con eso ya estás en marcha!
        </li>
      </ol>
    ),
  },
  {
    id: "conceptos",
    title: "3 · Los conceptos base",
    body: (
      <ul className="space-y-3">
        <li>
          <b>Oportunidad</b> — la unidad central. En empleo es una postulación;
          en ventas, un negocio; en freelance, un proyecto. Tiene etapa,
          prioridad, fecha de próximo follow-up y, según el modo, un monto.
        </li>
        <li>
          <b>Empresa</b> (o cuenta / cliente / fondo, según el modo) — el lugar
          detrás de la oportunidad. Agrupa oportunidades y contactos.
        </li>
        <li>
          <b>Contacto</b> — una persona de tu red. Tiene{" "}
          <b>fuerza de relación</b> (frío / tibio / fuerte) y su propio
          historial.
        </li>
        <li>
          <b>Touchpoint</b> — cada interacción: email, LinkedIn, llamada,
          reunión, pedido de referido o nota. Es lo que construye la historia
          con cada persona y oportunidad.
        </li>
        <li>
          <b>Etapas</b> — las columnas del embudo (ej. Guardada → Aplicada →
          Entrevista → Oferta → Cerrada). Son editables por modo.
        </li>
      </ul>
    ),
  },
  {
    id: "tablero",
    title: "4 · El tablero (Kanban)",
    body: (
      <>
        <p>
          En <b>Oportunidades</b> ves tu embudo como un tablero. Cada card es una
          oportunidad; <b>arrastrala</b> entre columnas para moverla de etapa.
          El cambio se guarda solo.
        </p>
        <p>
          Tocá una card para abrir su <b>detalle</b>: datos, descripción,
          timeline de interacciones y el panel de personas que pueden ayudarte.
        </p>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "5 · El Dashboard",
    body: (
      <ul className="space-y-3">
        <li>
          <b>Próximos follow-ups</b> — lo vencido y lo de los próximos 14 días,
          entre oportunidades y contactos. Lo vencido aparece en rojo: es lo más
          urgente.
        </li>
        <li>
          <b>Sin contacto</b> — oportunidades activas donde todavía no conocés a
          nadie en la empresa. Ahí te falta un puente para un referido o un
          decisor.
        </li>
        <li>
          <b>Forecast</b> (en los modos con monto) — proyección ponderada del
          pipeline: suma cada monto por la probabilidad de su etapa.
        </li>
      </ul>
    ),
  },
  {
    id: "followups",
    title: "6 · Follow-ups y referidos",
    body: (
      <>
        <p>
          El corazón de Konexo. Poné una <b>fecha de próximo follow-up</b> en
          cada oportunidad y contacto: el Dashboard te los trae a tiempo para que
          ningún seguimiento se te escape (la mayoría de los procesos se cierran
          en el follow-up, no en el primer contacto).
        </p>
        <p>
          En el detalle de una oportunidad, el panel{" "}
          <b>“¿Quién puede referirte / quién decide acá?”</b> te muestra tus
          contactos en esa empresa ordenados por fuerza de relación, con un botón
          para registrar el pedido de referido.
        </p>
      </>
    ),
  },
  {
    id: "ia",
    title: "7 · La IA de tu lado",
    body: (
      <>
        <p>Konexo trae IA en tres lugares:</p>
        <ul className="space-y-3">
          <li>
            <b>Adaptar CV</b> (modo empleo) — compara tu CV con el aviso y
            sugiere keywords faltantes, bullets a reescribir y un resumen
            adaptado.
          </li>
          <li>
            <b>Asistente</b> — un chat que conoce tu embudo real y te ayuda a
            redactar mensajes (LinkedIn, email, follow-up, pedido de referido) y
            a decidir próximos pasos.
          </li>
          <li>
            <b>Equipo de agentes</b> — un Calificador ordena tu embudo por
            prioridad y un Redactor escribe los borradores de las más calientes,
            en paralelo. Vos revisás y enviás.
          </li>
        </ul>

        <h3 className="mt-6 font-display text-2xl tracking-wide text-alarm">
          Activar la IA gratis con Groq (recomendado)
        </h3>
        <p>
          <b>Groq</b> es un servicio en la nube que corre modelos de IA muy
          rápido y tiene un <b>plan gratis, sin tarjeta</b>.{" "}
          <b>No se instala nada</b>: solo necesitás una API key.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Entrá a{" "}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noreferrer"
              className="text-hero underline"
            >
              console.groq.com
            </a>{" "}
            y creá una cuenta gratis (podés entrar con Google).
          </li>
          <li>
            Andá a <b>API Keys → Create API Key</b>, ponele un nombre y{" "}
            <b>copiá la key</b> (empieza con{" "}
            <code className="rounded bg-ink/10 px-1 font-mono text-base">gsk_</code>
            ). Guardala: se muestra una sola vez.
          </li>
          <li>
            En Konexo: <b>Configuración → Inteligencia artificial</b> → elegí{" "}
            <b>Groq</b> como proveedor, pegá la key y tocá{" "}
            <b>Probar conexión</b>.
          </li>
          <li>¡Listo! Ya podés adaptar tu CV y usar el asistente y los agentes.</li>
        </ol>

        <h3 className="mt-6 font-display text-2xl tracking-wide text-alarm">
          Limitaciones de Groq (plan gratis)
        </h3>
        <ul className="space-y-2">
          <li>
            <b>Límites de uso</b>: hay topes de pedidos y de tokens por minuto y
            por día. Si los superás, esperás un momento y reintentás. Para uso
            personal alcanza de sobra.
          </li>
          <li>
            <b>Modelos</b>: usa modelos open source (ej. Llama). Son muy buenos,
            pero la disponibilidad puede cambiar; si un modelo se discontinúa,
            elegís otro en Configuración.
          </li>
          <li>
            <b>Privacidad</b>: tus textos (CV, descripción del aviso, mensajes)
            se envían a los servidores de Groq para procesarlos. No es 100%
            local.
          </li>
          <li>
            <b>Necesita internet</b>: es un servicio en la nube.
          </li>
        </ul>

        <h3 className="mt-6 font-display text-2xl tracking-wide text-hero">
          Alternativas
        </h3>
        <p>
          Si querés que <b>nada salga de tu máquina</b>, instalá{" "}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noreferrer"
            className="text-hero underline"
          >
            Ollama
          </a>
          , descargá un modelo (ej.{" "}
          <code className="rounded bg-ink/10 px-1 font-mono text-base">
            ollama pull llama3.2
          </code>
          ) y en Configuración elegí <b>Ollama</b>: gratis y 100% privado (la
          velocidad depende de tu compu). También podés usar tu propia API key de{" "}
          <b>Anthropic, OpenAI o Google</b>.
        </p>
      </>
    ),
  },
  {
    id: "configuracion",
    title: "8 · Configuración",
    body: (
      <ul className="space-y-3">
        <li>
          <b>Modos</b> — activá uno o varios (empleo, ventas, freelance, etc.).
          Cambian el vocabulario, las etapas y el tablero.
        </li>
        <li>
          <b>Etapas del embudo</b> — renombrá, reordená, agregá o borrá etapas de
          cada modo. La probabilidad de cada etapa alimenta el forecast.
        </li>
        <li>
          <b>Perfil de negocio y remitente</b> — contale a la IA qué hacés, con
          qué datos firmar y en qué tono escribir.
        </li>
        <li>
          <b>Versiones de CV</b> — guardá variantes de tu CV para vincularlas a
          cada oportunidad.
        </li>
      </ul>
    ),
  },
  {
    id: "modos",
    title: "9 · Cambiar de modo",
    body: (
      <p>
        Si activaste más de un modo, el <b>switcher</b> aparece arriba del menú
        lateral. Cambiar de modo cambia todo el vocabulario, las etapas y los
        datos que ves — cada modo es su propio espacio. Empezás por empleo y, el
        día que arranques a vender o freelancear, el motor ya está listo.
      </p>
    ),
  },
  {
    id: "datos",
    title: "10 · Tus datos",
    body: (
      <p>
        Tu información (oportunidades, contactos, notas y la API key de IA que
        configures) es <b>privada y separada</b> de la de cualquier otro
        usuario. Solo vos ves tus datos cuando iniciás sesión.
      </p>
    ),
  },
];

export default function GuiaPage() {
  return (
    <main className="halftone min-h-screen bg-paper font-hand text-ink selection:bg-komic selection:text-ink">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b-4 border-ink bg-paper halftone">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/home" className="font-display text-3xl tracking-wider md:text-4xl">
            KONE<span className="text-alarm">X</span>O
          </Link>
          <Link
            href="/sign-up"
            className="btn-comic rough bg-komic px-4 py-1.5 font-display text-lg tracking-wider md:text-xl"
          >
            ¡EMPIEZA YA!
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        {/* HEADER */}
        <header className="mb-10">
          <div className="mb-4 inline-block -rotate-2 bg-ink px-4 py-1 font-display text-lg tracking-widest text-paper">
            MANUAL DEL HÉROE
          </div>
          <h1 className="stroke-ink font-display text-5xl leading-[0.95] tracking-wide text-komic md:text-7xl">
            CÓMO USAR KONEXO
          </h1>
          <p className="mt-4 max-w-2xl text-xl leading-snug md:text-2xl">
            Todo lo que necesitás para sacarle el jugo a Konexo, de los conceptos
            base a la IA y la configuración.
          </p>
        </header>

        {/* ÍNDICE */}
        <nav className="panel rough mb-12 p-5">
          <p className="mb-3 font-display text-xl tracking-wide">EN ESTA GUÍA</p>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-lg hover:text-alarm hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* SECCIONES */}
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="mb-3 font-display text-3xl tracking-wide text-hero md:text-4xl">
                {s.title}
              </h2>
              <div className="space-y-3 text-lg leading-relaxed md:text-xl">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="panel rough-2 mt-14 bg-komic p-8 text-center">
          <h2 className="font-display text-3xl tracking-wide md:text-4xl">
            ¿LISTO PARA EMPEZAR?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xl">
            Creá tu cuenta gratis y armá tu primer embudo en 30 segundos.
          </p>
          <Link
            href="/sign-up"
            className="btn-comic rough mt-6 inline-block border-4 border-ink bg-alarm px-8 py-3 font-display text-2xl tracking-wider text-paper"
          >
            ¡CREAR MI CUENTA! →
          </Link>
        </div>

        <div className="mt-10 text-center">
          <Link href="/home" className="font-display text-lg tracking-wide text-ink/60 hover:text-ink">
            ← VOLVER A LA LANDING
          </Link>
        </div>
      </div>
    </main>
  );
}
