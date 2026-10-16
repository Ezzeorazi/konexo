import { INJECTION_GUARD, userData } from "@/lib/prompt-safety";
import type { JobProfile } from "@/lib/fit";

// Preparación de entrevista (Fase 4, modo empleo). Adaptado de /interview y
// 07-interview-prep.md de ai-job-search (github.com/MadsLorentzen/ai-job-search,
// MIT): prep pack por TIPO de entrevista y un simulacro con feedback por
// respuesta. Regla central del repo: consistencia con el CV que el
// entrevistador ya leyó, y honestidad con las brechas (nunca inventar).

export const INTERVIEW_STAGES = [
  {
    key: "screening",
    label: "Screening / RRHH",
    focus:
      "motivación, por qué esta empresa, trayectoria del CV, expectativas salariales y disponibilidad",
  },
  {
    key: "technical",
    label: "Técnica",
    focus:
      "el stack y los requisitos técnicos del aviso, cómo resolvés problemas, decisiones y trade-offs de tus proyectos",
  },
  {
    key: "final",
    label: "Final / con el manager",
    focus:
      "fit con el equipo, valores, liderazgo y colaboración, salario, y \"¿tenés alguna reserva?\"",
  },
] as const;

export type InterviewStage = (typeof INTERVIEW_STAGES)[number]["key"];

export function isInterviewStage(v: unknown): v is InterviewStage {
  return INTERVIEW_STAGES.some((s) => s.key === v);
}

export function stageInfo(stage: InterviewStage) {
  return INTERVIEW_STAGES.find((s) => s.key === stage)!;
}

export type InterviewContext = {
  title: string;
  company: string | null;
  jobDescription: string;
  /** El CV asignado: es lo que el entrevistador leyó. */
  cv: string | null;
  profile: JobProfile | null;
  /** Brechas del "Evaluar fit", si se evaluó. */
  gaps: string[];
  /** Notas de la actividad de la búsqueda (feedback de etapas anteriores). */
  history: string[];
};

const contextBlock = (c: InterviewContext) =>
  [
    `Puesto: ${c.title}${c.company ? ` en ${c.company}` : ""}`,
    "--- AVISO ---",
    userData(c.jobDescription, 5000),
    "",
    "--- CV QUE EL ENTREVISTADOR LEYÓ ---",
    c.cv ? userData(c.cv, 6000) : "(no hay CV asignado: basate en el perfil)",
    "",
    "--- PERFIL DECLARADO ---",
    c.profile
      ? userData(
          [
            `Skills fuertes: ${c.profile.jobSkillsStrong || "(sin dato)"}`,
            `Lo que le falta: ${c.profile.jobSkillsWeak || "(sin dato)"}`,
            `Experiencia: ${c.profile.jobExperience || "(sin dato)"}`,
            `Objetivos: ${c.profile.jobGoals || "(sin dato)"}`,
          ].join("\n"),
          2000
        )
      : "(sin perfil)",
    "",
    "--- BRECHAS DETECTADAS AL EVALUAR EL FIT ---",
    c.gaps.length ? userData(c.gaps.map((g) => `- ${g}`).join("\n"), 1000) : "(sin evaluar)",
    "",
    "--- LO QUE PASÓ HASTA AHORA EN ESTE PROCESO ---",
    c.history.length ? userData(c.history.join("\n"), 2500) : "(sin notas)",
  ].join("\n");

const HONESTY =
  "NUNCA inventes experiencia, empresas, números ni logros que no estén en el CV o el perfil. Para una brecha, la respuesta honesta es: reconocerla, conectar con experiencia cercana y mostrar cómo la cerrarías. Si a una historia le falta un dato, poné [completá: dato]. Sobre la empresa, usá solo lo que dice el aviso: nada de datos inventados.";

export function buildPrepPrompt(
  c: InterviewContext,
  stage: InterviewStage
): { system: string; prompt: string } {
  const s = stageInfo(stage);
  return {
    system: [
      "Sos un coach de entrevistas laborales, concreto y honesto. Respondés en español, en texto plano (sin Markdown, sin asteriscos).",
      "Regla de oro: consistencia con el CV que el entrevistador ya leyó. Nada que no esté en el papel, y todo lo del papel defendible en profundidad.",
      HONESTY,
      INJECTION_GUARD,
    ].join("\n\n"),
    prompt: [
      contextBlock(c),
      "",
      `--- TIPO DE ENTREVISTA: ${s.label} (foco: ${s.focus}) ---`,
      "",
      "--- TAREA ---",
      "Armá el pack de preparación con estas secciones, con estos títulos exactos:",
      "PREGUNTAS PROBABLES: 6-8, priorizadas así: lo que quedó pendiente o dudoso en etapas anteriores > las brechas del fit > los requisitos del aviso > el tipo de entrevista.",
      "TUS HISTORIAS STAR: 3-4 historias (Situación, Tarea, Acción, Resultado) armadas SOLO con hechos del CV o el perfil, cada una con a qué preguntas responde. 1-2 minutos cada una.",
      "LO QUE TE VAN A PREGUNTAR DEL CV: las 3-4 afirmaciones del CV que más probablemente profundicen, y qué tenés que poder explicar de cada una.",
      "PREGUNTAS DIFÍCILES: \"¿por qué esta empresa?\" (con datos del aviso, no genérico), \"no tenés X\" para cada brecha importante (respuesta puente honesta), y las propias de este tipo de entrevista.",
      "PREGUNTAS PARA HACER: 4-5 adaptadas a este tipo de entrevista. Si es la final, incluí al menos una para detectar algo que te haría decir que no.",
      "CHECKLIST DEL DÍA: 4-5 ítems cortos.",
    ].join("\n"),
  };
}

/** Mensaje inicial (oculto) que arranca el simulacro: el modelo espera un "user" primero. */
export const MOCK_KICKOFF = "Estoy listo. Empezá el simulacro.";

/** Cantidad de preguntas del simulacro antes del cierre con devolución. */
export const MOCK_QUESTIONS = 6;

export function buildMockSystemPrompt(
  c: InterviewContext,
  stage: InterviewStage,
  prep: string | null
): string {
  const s = stageInfo(stage);
  return [
    `Sos el entrevistador de ${c.company ?? "la empresa"} para el puesto "${c.title}", en una entrevista de tipo ${s.label} (foco: ${s.focus}). Esto es un SIMULACRO de práctica: el candidato te va a responder y vos lo entrenás. Hablás en español rioplatense, cordial pero exigente, como un entrevistador real.`,
    "",
    "CÓMO SE CORRE EL SIMULACRO:",
    `- Hacé UNA sola pregunta por mensaje. En total ${MOCK_QUESTIONS} preguntas, en este orden: 1 de calentamiento ("contame de vos"), 2-3 específicas del puesto y de los requisitos del aviso, 1-2 de comportamiento ligadas a las competencias del aviso, y 1 difícil o inesperada (si hay brechas, usá una).`,
    "- Después de cada respuesta del candidato, antes de la próxima pregunta, dale una devolución breve en este formato exacto:",
    "  ✅ Lo que funcionó: (una línea)",
    "  🔧 Para afinar: (una línea concreta)",
    "  📌 Te habría servido: (qué historia o dato de su CV usar, si aplica)",
    "  Y después, la próxima pregunta.",
    `- Después de la respuesta ${MOCK_QUESTIONS}, no preguntes más: cerrá con una DEVOLUCIÓN FINAL de 3-5 líneas (puntos fuertes, lo que más tiene que practicar, y una nota del 1 al 10 de cómo le fue).`,
    "- Si el candidato dice algo que contradice su CV o inventa experiencia, señalalo en \"Para afinar\": en una entrevista real eso se nota.",
    "- Si responde \"no sé\" o muy corto, ayudalo a armar una respuesta mejor en la devolución y seguí.",
    "- Si el candidato pide terminar, cerrá con la devolución final.",
    "",
    HONESTY,
    "",
    "CONTEXTO (para vos, no lo leas en voz alta):",
    contextBlock(c),
    prep ? `\n--- PACK DE PREPARACIÓN QUE YA ARMÓ ---\n${userData(prep, 4000)}` : "",
    "",
    INJECTION_GUARD,
  ].join("\n");
}
