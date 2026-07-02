import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { TRACKS, getVocab } from "@/lib/tracks";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/guia",
  title: "Guía de uso — Konexo",
  description:
    "Cómo usar Konexo de punta a punta: oportunidades, contactos, follow-ups, el tablero, el seguimiento de proyectos, el calendario, los modos, la IA y la configuración.",
});

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
    id: "calendario",
    title: "7 · El calendario",
    body: (
      <>
        <p>
          Cada oportunidad y contacto puede tener una{" "}
          <b>fecha de próximo follow-up</b>. En <b>Calendario</b> los ves todos
          juntos, en una agenda con dos bloques: <b>vencidos</b> (en rojo, lo más
          urgente) y <b>próximos</b>. Cada ítem te lleva a su detalle con un clic.
        </p>
        <p>
          Lo mejor: <b>llevátelo al teléfono</b>. Generá un{" "}
          <b>enlace de suscripción</b> y agregalo al calendario del celular; tus
          follow-ups aparecen ahí y se actualizan solos. El enlace es{" "}
          <b>secreto</b> (cualquiera que lo tenga ve tus follow-ups): podés{" "}
          <b>regenerarlo</b> cuando quieras y el anterior deja de funcionar.
        </p>
        <ul className="space-y-3">
          <li>
            <b>iPhone / Apple Calendar</b> — suscribí el enlace (Ajustes →
            Calendario → Añadir calendario suscrito). Las <b>alertas</b> del feed
            funcionan: te avisa el teléfono.
          </li>
          <li>
            <b>Android / Google Calendar</b> — agregá el enlace desde Google
            Calendar en la computadora (Otros calendarios → Desde URL) y aparece
            en el teléfono. Ojo: Google <b>muestra</b> los eventos pero no envía
            notificaciones de calendarios suscriptos por URL.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "seguimiento",
    title: "8 · Seguimiento del proyecto",
    body: (
      <>
        <p>
          Cerrar el trato es la mitad del juego: después hay que{" "}
          <b>entregar</b>. En los modos con fase de ejecución (hoy{" "}
          <b>Freelance</b>), el detalle de cada oportunidad suma dos herramientas
          para que ningún proyecto se enfríe ni se pierdan las ideas:
        </p>
        <ul className="space-y-3">
          <li>
            <b>Tareas del proyecto</b> — un checklist de hitos y entregables.
            Marcá lo hecho, <b>arrastrá para reordenar</b> por prioridad y las
            completadas caen al fondo. Siempre a la vista cuántas llevás (“2 de 5
            hechas”).
          </li>
          <li>
            <b>Bitácora</b> — un registro cronológico de <b>ideas</b> y{" "}
            <b>avances</b>. Anotá lo que se te ocurre y lo que vas logrando;
            podés <b>editar</b> cualquier entrada. Es la memoria viva del
            proyecto.
          </li>
        </ul>
        <p>
          <b>¿Propio o de cliente?</b> Marcá cada proyecto según sea tuyo o de un
          cliente. La IA los trata distinto: a los <b>propios</b> los gestiona
          como ejecución (resúmenes y próximos pasos, sin proponer mensajes a
          nadie); en los <b>de cliente</b> redacta solo si se lo pedís y, por
          defecto, te ayuda a ponerte al día.
        </p>
        <p>
          Lo mejor: <b>la IA lo lee</b>. El asistente y los agentes ven el estado
          de ejecución —qué falta y qué avanzaste— y lo usan para priorizar y
          gestionar. En el detalle, el botón <b>“Ponme al día”</b> te da en
          segundos un resumen del proyecto y los próximos pasos a partir de tus
          tareas y tu bitácora.
        </p>
        <p className="text-base text-ink/70">
          Este eje es <b>independiente del embudo comercial</b>: una cosa es{" "}
          <i>conseguir</i> el proyecto (las etapas) y otra <i>ejecutarlo</i>{" "}
          (tareas y bitácora). Cualquier modo nuevo con fase de entrega lo hereda
          con solo activarlo.
        </p>
      </>
    ),
  },
  {
    id: "ia",
    title: "9 · La IA de tu lado",
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
            <b>Asistente</b> — un chat que conoce tu embudo real (y el estado de
            ejecución de tus proyectos). Te <b>gestiona</b>: resume, te pone al
            día, prioriza y decide próximos pasos. Y si se lo pedís, redacta
            mensajes (LinkedIn, email, follow-up, pedido de referido).
          </li>
          <li>
            <b>Equipo de agentes</b> — un Calificador ordena tu embudo por
            prioridad y un Redactor escribe los borradores de las más calientes,
            en paralelo, teniendo en cuenta qué avanzaste en cada una. Vos
            revisás y enviás.
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
    title: "10 · Configuración",
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
    title: "11 · Los modos",
    body: <ModesReference />,
  },
  {
    id: "datos",
    title: "12 · Tus datos",
    body: (
      <p>
        Tu información (oportunidades, contactos, notas y la API key de IA que
        configures) es <b>privada y separada</b> de la de cualquier otro
        usuario. Solo vos ves tus datos cuando iniciás sesión.
      </p>
    ),
  },
];

// Referencia de modos generada desde la fuente de verdad (lib/tracks.ts).
// Sumar un modo nuevo ahí lo hace aparecer acá solo, con sus capacidades.
function ModesReference() {
  return (
    <>
      <p>
        Konexo es un solo motor con varios <b>lentes</b>. Activás los que uses en{" "}
        <b>Configuración → ¿Para qué usás Konexo?</b> y, si tenés más de uno, el{" "}
        <b>switcher</b> arriba del menú lateral te deja saltar entre ellos. Cada
        modo es <b>su propio espacio</b>: cambia el vocabulario, las etapas y los
        datos que ves. El motor —oportunidades → personas → seguimiento— es
        siempre el mismo.
      </p>
      <div className="space-y-4">
        {TRACKS.map((t) => {
          const v = getVocab(t);
          const caps = [
            v.hasValue && "💰 Forecast por monto",
            v.usesCv && "📄 Adapta tu CV con IA",
            v.hasDelivery && "🗂️ Tareas + bitácora del proyecto",
          ].filter(Boolean) as string[];
          return (
            <div key={t} className="panel rough p-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{v.emoji}</span>
                <h3 className="font-display text-2xl tracking-wide">{v.name}</h3>
              </div>
              <p className="mt-1 text-base text-ink/80">{v.tagline}</p>
              <div className="mt-3 grid gap-1 text-base sm:grid-cols-2">
                <p>
                  La oportunidad se llama <b>{v.oppSingular}</b>.
                </p>
                <p>
                  La empresa se llama <b>{v.companySingular}</b>.
                </p>
              </div>
              <p className="mt-2 text-base">
                <b>Etapas:</b> {v.stages.map((s) => s.label).join(" → ")}
              </p>
              {caps.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {caps.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 text-sm"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-base text-ink/70">
        Konexo crece sin reescribir nada: cada modo se define en un solo lugar y
        esta guía lo refleja al instante.
      </p>
    </>
  );
}

export default function GuiaPage() {
  return (
    <main className="halftone min-h-screen bg-paper font-hand text-ink selection:bg-komic selection:text-ink">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b-4 border-ink bg-paper halftone">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
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
