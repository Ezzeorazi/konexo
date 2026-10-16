// Galletas de la Victoria (modo empleo).
//
// Una "galleta" es una pista de próximo paso con alma de cómic: una frase épica
// + una misión concreta + (opcional) a dónde ir a cumplirla. Cumplirla es una
// VICTORIA que suma créditos al mismo pozo que las misiones de onboarding.
//
// El CRITERIO de cada misión está adaptado de los prompts de ai-job-search
// (github.com/MadsLorentzen/ai-job-search, MIT): filtros de idioma/permiso antes
// de puntuar, llamar al contacto solo con preguntas concretas, no perseguir
// antes de ~2 semanas, historias STAR, preguntas para el entrevistador,
// agradecer siempre y anotar lecciones al cerrar.
//
// Lógica PURA (sin Prisma ni Date.now implícito): el server arma el contexto
// de cada oportunidad (lib/fortune-data.ts) y acá solo se decide qué galleta
// toca. Así es testeable y el server puede re-validar un reclamo de victoria.

export type FortunePhase =
  | "saved"
  | "applied"
  | "interview"
  | "open" // etapa abierta custom (no es una de las 3 por defecto)
  | "offer"
  | "closed";

/** Contexto mínimo de una oportunidad de empleo para elegir su galleta. */
export type FortuneOpp = {
  id: string;
  title: string;
  companyName: string | null;
  stage: string;
  stageType: "open" | "won" | "lost";
  createdAt: Date;
  appliedAt: Date | null;
  nextFollowUpAt: Date | null;
  hasDescription: boolean;
  hasCv: boolean;
  hasContact: boolean;
  /** Veredicto de "Evaluar fit" (lib/fit.ts) o null si nunca se evaluó. */
  fitVerdict: string | null;
  /** Claves de galletas ya ganadas en esta oportunidad. */
  won: string[];
};

/** Galleta resuelta para una oportunidad: serializable, lista para el cliente. */
export type Fortune = {
  key: string;
  opportunityId: string;
  opportunityTitle: string;
  companyName: string | null;
  phrase: string;
  mission: string;
  credits: number;
  action: { label: string; href: string } | null;
};

type FortuneDef = {
  key: string;
  phases: FortunePhase[];
  /** Urgencia relativa: decide cuál sale en la galleta del día. */
  weight: number;
  credits: number;
  when?: (o: FortuneOpp, now: Date) => boolean;
  phrase: string;
  mission: (o: FortuneOpp) => string;
  action?: { label: string; href: (o: FortuneOpp) => string };
};

const DAY = 24 * 60 * 60 * 1000;
/** Días sin respuesta tras postular antes de que un follow-up sea aceptable. */
export const FOLLOW_UP_AFTER_DAYS = 14;
/** Días que una oportunidad guardada puede esperar antes de enfriarse. */
export const STALE_SAVED_DAYS = 14;

const daysSince = (d: Date, now: Date) => (now.getTime() - d.getTime()) / DAY;
const empresa = (o: FortuneOpp) => o.companyName ?? "la empresa";
const oppHref = (anchor?: string) => (o: FortuneOpp) =>
  `/oportunidades/${o.id}${anchor ? `#${anchor}` : ""}`;

// El ORDEN importa: dentro de una oportunidad sale la primera galleta que
// aplique y que no se haya ganado. Así cada victoria desbloquea la siguiente.
const CATALOG: FortuneDef[] = [
  // ===== Guardada: antes de invertir tiempo =====
  {
    key: "saved-gates",
    phases: ["saved"],
    weight: 40,
    credits: 10,
    when: (o) => !o.fitVerdict,
    phrase: "Ningún héroe entra a una batalla sin mirar el mapa.",
    mission: () =>
      "Evaluá el fit antes de invertir tiempo: la IA revisa si el aviso exige un idioma, permiso de trabajo o ubicación que no tenés, y lo puntúa contra tu perfil.",
    action: { label: "Evaluar fit", href: oppHref("fit") },
  },
  {
    key: "saved-wall",
    phases: ["saved"],
    weight: 45,
    credits: 10,
    when: (o) => o.fitVerdict === "blocked",
    phrase: "Esta muralla no se trepa: se rodea.",
    mission: () =>
      "Un filtro duro no pasa (idioma, permiso o ubicación). Cerrala sin culpa y buscá otra con el mismo perfil, salvo que sepas algo que el aviso no dice.",
    action: { label: "Ver el fit", href: oppHref("fit") },
  },
  {
    key: "saved-weak-fit",
    phases: ["saved"],
    weight: 35,
    credits: 10,
    when: (o) => o.fitVerdict === "weak" || o.fitVerdict === "poor",
    phrase: "No toda batalla merece tu ejército.",
    mission: () =>
      "El fit dio bajo. Si no hay una razón estratégica para ir, cerrala y poné la energía en una que encaje mejor.",
    action: { label: "Ver el fit", href: oppHref("fit") },
  },
  {
    key: "saved-description",
    phases: ["saved", "applied", "open"],
    weight: 35,
    credits: 10,
    when: (o) => !o.hasDescription,
    phrase: "Un mapa en blanco no gana guerras.",
    mission: () =>
      "Pegá la descripción del aviso en esta oportunidad: sin ella no hay CV a medida ni estrategia.",
    action: { label: "Pegar el aviso", href: oppHref("aviso") },
  },
  {
    key: "saved-ally",
    phases: ["saved", "applied", "open"],
    weight: 50,
    credits: 15,
    when: (o) => !o.hasContact,
    phrase: "Las puertas se abren desde adentro.",
    mission: (o) =>
      `Encontrá un aliado en ${empresa(o)} que te pueda referir. Un referido vale más que cien postulaciones.`,
    action: { label: "Buscar en mi red", href: () => "/contactos" },
  },
  {
    key: "saved-call",
    phases: ["saved"],
    weight: 20,
    credits: 10,
    when: (o) => o.hasContact,
    phrase: "Una pregunta bien hecha vale más que diez CV.",
    mission: (o) =>
      `Si el aviso es ambiguo, escribile a tu contacto en ${empresa(o)} con una o dos preguntas concretas (¿cuál es el mayor desafío del rol? ¿qué es imprescindible y qué es deseable?). Nunca solo para "que te recuerden".`,
  },
  {
    key: "saved-armor",
    phases: ["saved"],
    weight: 45,
    credits: 15,
    when: (o) => !o.hasCv,
    phrase: "La armadura se ajusta al enemigo.",
    mission: () =>
      "Adaptá tu CV a este aviso: que cada requisito importante tenga una prueba concreta en tu experiencia.",
    action: { label: "Adaptar CV", href: oppHref("cv") },
  },
  {
    key: "saved-attack",
    phases: ["saved"],
    weight: 30,
    credits: 15,
    when: (o, now) => daysSince(o.createdAt, now) >= STALE_SAVED_DAYS,
    phrase: "La oportunidad que no se ataca, se enfría.",
    mission: () =>
      "Hace más de dos semanas que la guardaste: postulate esta semana o cerrala. Las dos son victorias.",
  },
  {
    key: "saved-launch",
    phases: ["saved"],
    weight: 25,
    credits: 20,
    phrase: "El que duda, mira desde la tribuna.",
    mission: () =>
      "Ya tenés mapa y armadura: postulate y pasala a la etapa siguiente.",
  },

  // ===== Aplicada: paciencia estratégica =====
  {
    key: "applied-radar",
    phases: ["applied", "open"],
    weight: 55,
    credits: 10,
    when: (o) => !o.nextFollowUpAt,
    phrase: "Sin radar, el enemigo se escapa.",
    mission: () =>
      `Agendá el próximo follow-up (unos ${FOLLOW_UP_AFTER_DAYS} días después de postular) para que no se te pase.`,
    action: { label: "Agendar follow-up", href: oppHref() },
  },
  {
    key: "applied-wait",
    phases: ["applied"],
    weight: 15,
    credits: 5,
    when: (o, now) =>
      !!o.appliedAt && daysSince(o.appliedAt, now) < FOLLOW_UP_AFTER_DAYS,
    phrase: "El buen estratega sabe esperar.",
    mission: () =>
      "No llames para \"destacarte\": arriesga más de lo que suma. Usá este tiempo para preparar tus historias de entrevista.",
  },
  {
    key: "applied-followup",
    phases: ["applied"],
    weight: 70,
    credits: 15,
    when: (o, now) =>
      !o.appliedAt || daysSince(o.appliedAt, now) >= FOLLOW_UP_AFTER_DAYS,
    phrase: "El silencio no es un no. Es tu turno.",
    mission: (o) =>
      `Pasaron un par de semanas sin respuesta: mandá a ${empresa(o)} un follow-up breve y amable preguntando por el estado del proceso.`,
  },

  // ===== Entrevista: llegar preparado =====
  {
    key: "interview-star",
    phases: ["interview"],
    weight: 80,
    credits: 20,
    phrase: "Llegá con tres historias y salís con una oferta.",
    mission: () =>
      "Escribí tres historias STAR (Situación, Tarea, Acción, Resultado) que respondan a los requisitos del aviso. Uno o dos minutos cada una, con resultados concretos.",
  },
  {
    key: "interview-why",
    phases: ["interview"],
    weight: 65,
    credits: 15,
    phrase: "\"¿Por qué nosotros?\" no se improvisa.",
    mission: (o) =>
      `Investigá dos datos concretos de ${empresa(o)}: un proyecto, sus valores o una noticia reciente. Nada de respuestas genéricas.`,
  },
  {
    key: "interview-ask",
    phases: ["interview"],
    weight: 60,
    credits: 10,
    phrase: "El que pregunta, también evalúa.",
    mission: () =>
      "Prepará tres preguntas para el entrevistador: cómo es una semana típica, qué sería un éxito a los 6 meses, y cuánto es desarrollo nuevo vs mantenimiento.",
  },
  {
    key: "interview-thanks",
    phases: ["interview"],
    weight: 75,
    credits: 15,
    phrase: "Los grandes cierran con gratitud.",
    mission: () =>
      "Después de la entrevista, mandá un agradecimiento de dos o tres líneas. Breve, sincero, sin volver a venderte.",
  },

  // ===== Oferta =====
  {
    key: "offer-negotiate",
    phases: ["offer"],
    weight: 90,
    credits: 20,
    phrase: "Una oferta no es el final: es una negociación.",
    mission: () =>
      "Compará la oferta con tu rango y con el mercado, y pedí todo por escrito (salario, modalidad, fecha de inicio) antes de decir que sí.",
  },

  // ===== Cerrada =====
  {
    key: "closed-lesson",
    phases: ["closed"],
    weight: 10,
    credits: 10,
    phrase: "Toda batalla deja un mapa mejor.",
    mission: () =>
      "Anotá en una nota qué funcionó y qué no en este proceso. La próxima evaluación sale más afinada.",
    action: { label: "Anotar lección", href: oppHref("actividad") },
  },
  {
    key: "closed-door",
    phases: ["closed"],
    weight: 5,
    credits: 10,
    phrase: "Las puertas que se cierran con elegancia se vuelven a abrir.",
    mission: (o) =>
      `Agradecé igual a tus contactos de ${empresa(o)}: el próximo rol puede estar ahí.`,
  },
];

const BY_KEY = new Map(CATALOG.map((f) => [f.key, f]));

export function isFortuneKey(key: string): boolean {
  return BY_KEY.has(key);
}

/** Etapa → fase de galleta. Las 3 etapas por defecto tienen fase propia; una
 *  etapa custom abierta cae en "open" (solo pistas genéricas). */
export function phaseOf(
  stage: string,
  stageType: FortuneOpp["stageType"]
): FortunePhase {
  if (stageType === "won") return "offer";
  if (stageType === "lost") return "closed";
  if (stage === "SAVED") return "saved";
  if (stage === "APPLIED") return "applied";
  if (stage === "INTERVIEW") return "interview";
  return "open";
}

function matches(def: FortuneDef, o: FortuneOpp, now: Date): boolean {
  if (!def.phases.includes(phaseOf(o.stage, o.stageType))) return false;
  if (o.won.includes(def.key)) return false;
  return def.when ? def.when(o, now) : true;
}

function resolve(def: FortuneDef, o: FortuneOpp): Fortune {
  return {
    key: def.key,
    opportunityId: o.id,
    opportunityTitle: o.title,
    companyName: o.companyName,
    phrase: def.phrase,
    mission: def.mission(o),
    credits: def.credits,
    action: def.action
      ? { label: def.action.label, href: def.action.href(o) }
      : null,
  };
}

/** La galleta que toca ahora para esta oportunidad (null = no queda ninguna). */
export function pickFortune(o: FortuneOpp, now: Date): Fortune | null {
  const def = CATALOG.find((d) => matches(d, o, now));
  return def ? resolve(def, o) : null;
}

/** Hash chico y determinístico para desempatar sin Math.random. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * La galleta del día: la más urgente de todo el pipeline de empleo. Entre
 * empates, el día decide (determinístico: la misma galleta todo el día).
 */
export function pickDailyFortune(
  opps: FortuneOpp[],
  now: Date,
  dayKey: string
): Fortune | null {
  let best: { fortune: Fortune; weight: number; tie: number } | null = null;
  for (const o of opps) {
    const f = pickFortune(o, now);
    if (!f) continue;
    const weight = BY_KEY.get(f.key)!.weight;
    const tie = hash(`${dayKey}:${o.id}`);
    if (
      !best ||
      weight > best.weight ||
      (weight === best.weight && tie > best.tie)
    ) {
      best = { fortune: f, weight, tie };
    }
  }
  return best?.fortune ?? null;
}

/** Créditos extra por cumplir la galleta del día (el ritual diario). */
export const DAILY_BONUS = 5;

/** Clave de día en hora de Argentina ("YYYY-MM-DD"), para el ritual diario. */
export function fortuneDayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
