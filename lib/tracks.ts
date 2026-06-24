// Un "track" es el lente con el que se usa Konexo: la misma estructura
// (Company → Opportunity → Contact → Touchpoint) vestida para un objetivo.
// Las ETAPAS del embudo dejaron de ser un enum fijo: ahora cada vertical trae
// su propio set como datos. Sumar un vertical nuevo = agregar una entrada acá.

export type Track =
  | "jobs"
  | "sales"
  | "realestate"
  | "freelance"
  | "startup"
  | "recruiting";

export const TRACKS: Track[] = [
  "jobs",
  "sales",
  "realestate",
  "freelance",
  "startup",
  "recruiting",
];

export const DEFAULT_TRACK: Track = "jobs";

export function isTrack(value: unknown): value is Track {
  return typeof value === "string" && (TRACKS as string[]).includes(value);
}

export type StageType = "open" | "won" | "lost";
export type StageDef = {
  key: string;
  label: string;
  type: StageType;
  /** 0-100, probabilidad de cierre para el forecast ponderado. */
  probability: number;
};

export type TrackVocab = {
  key: Track;
  /** Nombre del modo (switcher / configuración / landing). */
  name: string;
  /** Emoji insignia para switcher y landing. */
  emoji: string;
  /** Una línea que explica el modo. */
  tagline: string;
  /** ¿Está disponible hoy o es un preset en camino? */
  status: "live" | "soon";

  /** Sustantivo de la entidad central. */
  oppSingular: string;
  oppPlural: string;
  newOpp: string;
  boardDescription: string;

  /** Cómo se llama Company en este modo. */
  companySingular: string;
  companyPlural: string;

  /** ¿La entidad central tiene un monto en dinero? Activa el forecast. */
  hasValue: boolean;
  valueLabel: string;
  valuePlaceholder: string;

  /** Solo búsqueda laboral usa versiones de CV + adaptación con IA. */
  usesCv: boolean;

  descriptionLabel: string;
  descriptionPlaceholder: string;
  firstDateLabel: string;

  /** Título de la card de personas en el detalle de la oportunidad. */
  decisionTitle: string;
  decisionHint: string;

  /** Etapas del embudo, en orden. */
  stages: StageDef[];
};

const VOCAB: Record<Track, TrackVocab> = {
  jobs: {
    key: "jobs",
    name: "Búsqueda laboral",
    emoji: "🎯",
    tagline:
      "Organizá tu búsqueda de empleo: avisos, postulaciones y contactos que pueden referirte.",
    status: "live",
    oppSingular: "oportunidad",
    oppPlural: "Oportunidades",
    newOpp: "Nueva oportunidad",
    boardDescription:
      "Tu embudo de búsqueda: arrastrá las cards para moverlas de etapa.",
    companySingular: "empresa",
    companyPlural: "Empresas",
    hasValue: false,
    valueLabel: "Rango salarial",
    valuePlaceholder: "Ej.: USD 3.000 - 4.000",
    usesCv: true,
    descriptionLabel: "Descripción del puesto",
    descriptionPlaceholder: "Pegá acá la descripción del aviso...",
    firstDateLabel: "Fecha de aplicación",
    decisionTitle: "¿Quién puede referirte acá?",
    decisionHint: "Un referido multiplica tus chances. Estos son tus contactos en",
    stages: [
      { key: "SAVED", label: "Guardada", type: "open", probability: 5 },
      { key: "APPLIED", label: "Aplicada", type: "open", probability: 20 },
      { key: "INTERVIEW", label: "Entrevista", type: "open", probability: 50 },
      { key: "OFFER", label: "Oferta", type: "won", probability: 90 },
      { key: "CLOSED", label: "Cerrada", type: "lost", probability: 0 },
    ],
  },
  sales: {
    key: "sales",
    name: "Ventas",
    emoji: "💰",
    tagline:
      "Administrá tu pipeline comercial: prospectos, propuestas y seguimientos para cerrar.",
    status: "live",
    oppSingular: "negocio",
    oppPlural: "Negocios",
    newOpp: "Nuevo negocio",
    boardDescription:
      "Tu pipeline de ventas: arrastrá las cards para moverlas de etapa.",
    companySingular: "cuenta",
    companyPlural: "Cuentas",
    hasValue: true,
    valueLabel: "Monto del negocio",
    valuePlaceholder: "Ej.: 15000",
    usesCv: false,
    descriptionLabel: "Necesidad / contexto",
    descriptionPlaceholder:
      "Qué necesita el prospecto, dolor que resolvés, presupuesto...",
    firstDateLabel: "Primer contacto",
    decisionTitle: "¿Quién decide acá?",
    decisionHint: "Identificá a los decisores. Estos son tus contactos en",
    // Comparte las keys con jobs para no migrar datos existentes.
    stages: [
      { key: "SAVED", label: "Prospecto", type: "open", probability: 10 },
      { key: "APPLIED", label: "Contactado", type: "open", probability: 25 },
      { key: "INTERVIEW", label: "Propuesta", type: "open", probability: 50 },
      { key: "OFFER", label: "Negociación", type: "open", probability: 75 },
      { key: "CLOSED", label: "Cerrado", type: "won", probability: 100 },
    ],
  },
  realestate: {
    key: "realestate",
    name: "Inmobiliaria",
    emoji: "🏠",
    tagline:
      "Prospecto → visita → oferta → escritura. Cada propiedad y cada cliente, con su pipeline.",
    status: "soon",
    oppSingular: "operación",
    oppPlural: "Operaciones",
    newOpp: "Nueva operación",
    boardDescription:
      "Tu pipeline inmobiliario: arrastrá las operaciones de etapa.",
    companySingular: "cliente",
    companyPlural: "Clientes",
    hasValue: true,
    valueLabel: "Valor de la propiedad",
    valuePlaceholder: "Ej.: 120000",
    usesCv: false,
    descriptionLabel: "Ficha de la propiedad",
    descriptionPlaceholder:
      "Tipo, ubicación, m², ambientes, condiciones, expensas...",
    firstDateLabel: "Primer contacto",
    decisionTitle: "¿Quién decide la compra?",
    decisionHint: "Comprador, cónyuge, asesor. Estos son tus contactos en",
    stages: [
      { key: "RE_PROSPECT", label: "Prospecto", type: "open", probability: 10 },
      { key: "RE_VISIT", label: "Visita", type: "open", probability: 30 },
      { key: "RE_OFFER", label: "Oferta", type: "open", probability: 55 },
      { key: "RE_RESERVE", label: "Reserva", type: "open", probability: 80 },
      { key: "RE_DEED", label: "Escritura", type: "won", probability: 100 },
    ],
  },
  freelance: {
    key: "freelance",
    name: "Freelance",
    emoji: "🧑‍💻",
    tagline:
      "Clientes, propuestas y cobros. Que ningún proyecto se enfríe ni ninguna factura se olvide.",
    status: "soon",
    oppSingular: "proyecto",
    oppPlural: "Proyectos",
    newOpp: "Nuevo proyecto",
    boardDescription:
      "Tus proyectos y propuestas: arrastrá las cards de etapa.",
    companySingular: "cliente",
    companyPlural: "Clientes",
    hasValue: true,
    valueLabel: "Monto del proyecto",
    valuePlaceholder: "Ej.: 2500",
    usesCv: false,
    descriptionLabel: "Alcance del trabajo",
    descriptionPlaceholder:
      "Qué pide el cliente, entregables, plazos, presupuesto...",
    firstDateLabel: "Primer contacto",
    decisionTitle: "¿Quién aprueba el proyecto?",
    decisionHint: "Tu punto de contacto y quien firma. Tus contactos en",
    stages: [
      { key: "FL_LEAD", label: "Consulta", type: "open", probability: 10 },
      { key: "FL_PROPOSAL", label: "Propuesta", type: "open", probability: 35 },
      { key: "FL_NEGOTIATION", label: "Negociación", type: "open", probability: 60 },
      { key: "FL_ACTIVE", label: "En curso", type: "open", probability: 85 },
      { key: "FL_PAID", label: "Cobrado", type: "won", probability: 100 },
    ],
  },
  startup: {
    key: "startup",
    name: "Startup / Fundraising",
    emoji: "🚀",
    tagline:
      "Tu ronda bajo control: Lead → Pitch → Due diligence → Term sheet → Cerrado.",
    status: "soon",
    oppSingular: "inversor",
    oppPlural: "Inversores",
    newOpp: "Nuevo inversor",
    boardDescription:
      "Tu pipeline de fundraising: arrastrá a los inversores de etapa.",
    companySingular: "fondo",
    companyPlural: "Fondos",
    hasValue: true,
    valueLabel: "Ticket potencial",
    valuePlaceholder: "Ej.: 250000",
    usesCv: false,
    descriptionLabel: "Tesis / fit",
    descriptionPlaceholder:
      "Por qué encaja, tesis del fondo, tickets típicos, intros...",
    firstDateLabel: "Primer contacto",
    decisionTitle: "¿Quién decide en el fondo?",
    decisionHint: "Partner, analista, quien firma el cheque. Tus contactos en",
    stages: [
      { key: "SU_LEAD", label: "Lead", type: "open", probability: 5 },
      { key: "SU_PITCH", label: "Pitch", type: "open", probability: 20 },
      { key: "SU_DD", label: "Due diligence", type: "open", probability: 45 },
      { key: "SU_TERMSHEET", label: "Term sheet", type: "open", probability: 75 },
      { key: "SU_CLOSED", label: "Cerrado", type: "won", probability: 100 },
    ],
  },
  recruiting: {
    key: "recruiting",
    name: "Reclutamiento",
    emoji: "🧲",
    tagline:
      "Candidatos por vacante: Sourcing → Screening → Entrevista → Oferta → Contratado.",
    status: "soon",
    oppSingular: "candidato",
    oppPlural: "Candidatos",
    newOpp: "Nuevo candidato",
    boardDescription:
      "Tu pipeline de candidatos: arrastrá las cards de etapa.",
    companySingular: "cuenta",
    companyPlural: "Búsquedas",
    hasValue: false,
    valueLabel: "Pretensión salarial",
    valuePlaceholder: "Ej.: USD 4.000",
    usesCv: false,
    descriptionLabel: "Perfil de la búsqueda",
    descriptionPlaceholder: "Seniority, stack, must-haves, rango, modalidad...",
    firstDateLabel: "Primer contacto",
    decisionTitle: "¿Quién decide la contratación?",
    decisionHint: "Hiring manager y referentes. Tus contactos en",
    stages: [
      { key: "RC_SOURCED", label: "Sourced", type: "open", probability: 10 },
      { key: "RC_SCREEN", label: "Screening", type: "open", probability: 30 },
      { key: "RC_INTERVIEW", label: "Entrevista", type: "open", probability: 55 },
      { key: "RC_OFFER", label: "Oferta", type: "open", probability: 80 },
      { key: "RC_HIRED", label: "Contratado", type: "won", probability: 100 },
    ],
  },
};

export function getVocab(track: Track): TrackVocab {
  return VOCAB[isTrack(track) ? track : DEFAULT_TRACK];
}

/** Etapas POR DEFECTO del vertical (presets en código). La fuente de verdad
 * en runtime es la DB (lib/stages.ts); esto siembra y sirve de fallback. */
export function getStages(track: Track): StageDef[] {
  return getVocab(track).stages;
}

export function getStage(track: Track, key: string): StageDef | undefined {
  return getVocab(track).stages.find((s) => s.key === key);
}

// ---- Helpers PUROS sobre un array de etapas (presets o DB) ----

export function labelFor(stages: StageDef[], key: string): string {
  return stages.find((s) => s.key === key)?.label ?? key;
}

export function defaultStageKeyOf(stages: StageDef[]): string {
  return stages[0]?.key ?? "SAVED";
}

// ---- Estilos de etapa por posición en el embudo (look cómic) ----
type Tile = { bar: string; text: string };

const TILE_RAMP: Tile[] = [
  { bar: "bg-panelw", text: "text-ink" },
  { bar: "bg-komic", text: "text-ink" },
  { bar: "bg-hero", text: "text-paper" },
  { bar: "bg-alarm", text: "text-paper" },
  { bar: "bg-ink", text: "text-komic" },
];

const BADGE_RAMP = [
  "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
];

const WON_BADGE =
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
const LOST_BADGE =
  "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

export function tileFor(stages: StageDef[], key: string): Tile {
  const i = Math.max(
    0,
    stages.findIndex((s) => s.key === key)
  );
  return TILE_RAMP[i % TILE_RAMP.length];
}

export function badgeClassFor(stages: StageDef[], key: string): string {
  const stage = stages.find((s) => s.key === key);
  if (stage?.type === "won") return WON_BADGE;
  if (stage?.type === "lost") return LOST_BADGE;
  const i = Math.max(
    0,
    stages.findIndex((s) => s.key === key)
  );
  return BADGE_RAMP[i % BADGE_RAMP.length];
}

// ---- Wrappers sobre los presets (fallback sin DB) ----

export function stageLabel(track: Track, key: string): string {
  return labelFor(getStages(track), key);
}

export function defaultStageKey(track: Track): string {
  return defaultStageKeyOf(getStages(track));
}

export function stageTile(track: Track, key: string): Tile {
  return tileFor(getStages(track), key);
}

export function stageBadgeClass(track: Track, key: string): string {
  return badgeClassFor(getStages(track), key);
}
