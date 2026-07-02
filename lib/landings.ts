import { getVocab, isAvailableTrack, type Track } from "@/lib/tracks";

// Landings por vertical: páginas reales (crawlables) en /para/[slug].
// El vocabulario y las etapas salen de lib/tracks.ts; acá vive solo el copy
// de marketing propio de cada nicho.

export type Pain = { emoji: string; title: string; text: string };

export type Landing = {
  slug: string;
  track: Track;
  /** Título del hero, en líneas para el salto cómic. */
  headline: string[];
  sub: string;
  /** A quién le habla. */
  audience: string;
  pains: [Pain, Pain, Pain];
  ctaKicker: string;
};

const LANDINGS: Record<string, Landing> = {
  empleo: {
    slug: "empleo",
    track: "jobs",
    headline: ["TU BÚSQUEDA", "DE EMPLEO,", "NIVEL HÉROE"],
    sub: "Postulaciones, entrevistas y referidos en un plan de ataque panel por panel. Nada se te escapa.",
    audience: "Para quienes buscan trabajo y no quieren perder ninguna oportunidad.",
    pains: [
      { emoji: "📊", title: "EL EXCEL MUTANTE", text: "47 filas, 12 colores, cero idea de en qué quedó cada postulación." },
      { emoji: "👻", title: "EL GHOSTING", text: "\"Te escribimos pronto\"… hace 3 semanas. El follow-up nunca salió de tu cabeza." },
      { emoji: "🤯", title: "LA ENTREVISTA SORPRESA", text: "¿Qué CV mandaste? ¿Quién te entrevista? Llegás sin contexto al ring." },
    ],
    ctaKicker: "Tu próximo trabajo empieza ordenado.",
  },
  ventas: {
    track: "sales",
    slug: "ventas",
    headline: ["CERRÁ MÁS,", "PERSIGUIENDO", "MENOS"],
    sub: "Prospectos, propuestas y seguimientos en un pipeline que te dice exactamente a quién llamar hoy.",
    audience: "Para vendedores, consultores y dueños que cierran ellos mismos.",
    pains: [
      { emoji: "🧊", title: "EL DEAL CONGELADO", text: "Una propuesta enviada y nunca seguida. El 80% de las ventas se cierra en el follow-up." },
      { emoji: "🤷", title: "¿EN QUÉ QUEDAMOS?", text: "Sin historial, cada llamada empieza de cero y el prospecto lo nota." },
      { emoji: "📉", title: "EL FORECAST FANTASMA", text: "¿Cuánto vas a cerrar este mes? Sin pipeline, es pura corazonada." },
    ],
    ctaKicker: "Que ningún negocio se enfríe.",
  },
  inmobiliarias: {
    track: "realestate",
    slug: "inmobiliarias",
    headline: ["CADA", "PROPIEDAD,", "SU PIPELINE"],
    sub: "Prospecto → visita → oferta → reserva → escritura. Cada cliente y cada operación, bajo control.",
    audience: "Para agentes inmobiliarios independientes y equipos chicos.",
    pains: [
      { emoji: "🔑", title: "VISITAS QUE NO VUELVEN", text: "Mostraste 5 propiedades y no sabés a quién hacerle seguimiento." },
      { emoji: "📞", title: "EL COMPRADOR PERDIDO", text: "Pidió algo puntual hace un mes; cuando aparece la propiedad, ya no sabés a quién llamar." },
      { emoji: "🗂️", title: "PAPELES POR TODOS LADOS", text: "Reservas, ofertas y contactos en WhatsApp, mail y papel. Un caos para cerrar." },
    ],
    ctaKicker: "De la primera visita a la escritura.",
  },
  freelancers: {
    track: "freelance",
    slug: "freelancers",
    headline: ["NINGÚN", "CLIENTE SE TE", "ENFRÍA"],
    sub: "Consultas, propuestas, proyectos en curso y cobros. Tu negocio freelance, sin filtraciones.",
    audience: "Para freelancers y consultores que venden y entregan al mismo tiempo.",
    pains: [
      { emoji: "💬", title: "LA CONSULTA OLVIDADA", text: "Alguien te escribió interesado y se perdió entre mil mensajes." },
      { emoji: "🧾", title: "LA FACTURA FANTASMA", text: "Entregaste el proyecto… ¿y el cobro? Sin seguimiento, queda flotando." },
      { emoji: "🎭", title: "VENDER Y ENTREGAR A LA VEZ", text: "Cuando estás full de trabajo, dejás de prospectar. Y el mes que viene no hay nada." },
    ],
    ctaKicker: "Vendés y entregás, sin perder el hilo.",
  },
  startups: {
    track: "startup",
    slug: "startups",
    headline: ["TU RONDA,", "BAJO", "CONTROL"],
    sub: "Lead → pitch → due diligence → term sheet → cerrado. Tu pipeline de inversores, como un CRM de ventas.",
    audience: "Para founders levantando capital.",
    pains: [
      { emoji: "📧", title: "50 INVERSORES EN UN MAIL", text: "Un hilo de correo no es un pipeline. ¿A quién le debés follow-up hoy?" },
      { emoji: "⏳", title: "EL MOMENTUM PERDIDO", text: "Las rondas se cierran con momentum. Sin seguimiento, los \"interesados\" se enfrían." },
      { emoji: "🤝", title: "¿QUIÉN ME PRESENTA?", text: "La mejor intro es la cálida. ¿Quién de tu red te conecta con ese fondo?" },
    ],
    ctaKicker: "Levantá tu ronda como un pro.",
  },
  reclutadores: {
    track: "recruiting",
    slug: "reclutadores",
    headline: ["CADA", "VACANTE, SUS", "CANDIDATOS"],
    sub: "Sourcing → screening → entrevista → oferta → contratado. Cada búsqueda con su embudo de talento.",
    audience: "Para reclutadores freelance e in-house de equipos chicos.",
    pains: [
      { emoji: "🧵", title: "CANDIDATOS EN MIL LADOS", text: "LinkedIn, mail, planillas. ¿En qué etapa está cada uno de cada búsqueda?" },
      { emoji: "🕳️", title: "EL CANDIDATO EN EL LIMBO", text: "Buenísimo perfil, prometiste volver… y se enfrió sin respuesta." },
      { emoji: "📌", title: "EL HIRING MANAGER A CIEGAS", text: "Sin un tablero, mostrar el avance de la búsqueda es un mail eterno." },
    ],
    ctaKicker: "De sourcing a contratado, ordenado.",
  },
};

// Solo publicamos las landings de los modos disponibles (nicho fijado). Las de
// modos retirados dejan de tener página y de aparecer en el sitemap.
export const LANDING_SLUGS = Object.keys(LANDINGS).filter((slug) =>
  isAvailableTrack(LANDINGS[slug].track)
);

export function getLanding(slug: string): Landing | undefined {
  const landing = LANDINGS[slug];
  return landing && isAvailableTrack(landing.track) ? landing : undefined;
}

export function landingVocab(slug: string) {
  const landing = LANDINGS[slug];
  return landing ? getVocab(landing.track) : undefined;
}
