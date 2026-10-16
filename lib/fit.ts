import { z } from "zod";
import { INJECTION_GUARD, userData } from "@/lib/prompt-safety";

// "Evaluar fit" (modo empleo). Adaptado del framework de evaluación de
// ai-job-search (github.com/MadsLorentzen/ai-job-search, MIT,
// 04-job-evaluation.md): primero FILTROS que cortan sin puntuar (permiso de
// trabajo, idioma, ubicación) y después 4 dimensiones 0-100 ponderadas.
//
// La IA solo juzga (filtros + puntajes + notas). La aritmética (promedio
// ponderado) y el veredicto los calcula el server acá: un LLM chico se equivoca
// sumando, y así el umbral es siempre el mismo.

// ---------- Perfil de candidato (Settings por usuario) ----------

export const JOB_PROFILE_FIELDS = [
  {
    key: "jobSkillsStrong",
    label: "Skills fuertes",
    placeholder: "Ej.: React, TypeScript, Next.js, Node, Postgres",
  },
  {
    key: "jobSkillsMedium",
    label: "Skills intermedias",
    placeholder: "Ej.: Python, Docker, AWS",
  },
  {
    key: "jobSkillsWeak",
    label: "Lo que te falta (sé honesto)",
    placeholder: "Ej.: Kubernetes, Java, liderar equipos grandes",
  },
  {
    key: "jobExperience",
    label: "Experiencia",
    placeholder:
      "Ej.: 5 años como dev full-stack freelance (SaaS, e-commerce); 2 años de soporte técnico.",
    multiline: true,
  },
  {
    key: "jobGoals",
    label: "Objetivos de carrera",
    placeholder: "Ej.: crecer a tech lead en producto; trabajar con IA aplicada.",
    multiline: true,
  },
  {
    key: "jobEnergy",
    label: "Tareas que te dan energía / que te la quitan",
    placeholder:
      "Ej.: me energiza construir producto desde cero; me drena el mantenimiento puro y las reuniones eternas.",
    multiline: true,
  },
  {
    key: "jobLanguages",
    label: "Idiomas y nivel",
    placeholder: "Ej.: Español nativo, Inglés B2 (conversacional)",
  },
  {
    key: "jobWorkRights",
    label: "Permiso de trabajo",
    placeholder:
      "Ej.: ciudadano argentino; sin permiso para UE/EE.UU. (solo remoto como contractor)",
  },
  {
    key: "jobLocation",
    label: "Ubicación y modalidad",
    placeholder: "Ej.: Buenos Aires; remoto o híbrido en CABA; no me mudo.",
  },
] as const;

export type JobProfileKey = (typeof JOB_PROFILE_FIELDS)[number]["key"];
export type JobProfile = Record<JobProfileKey, string>;
export const JOB_PROFILE_KEYS = JOB_PROFILE_FIELDS.map((f) => f.key);

/** Mínimo para que la evaluación tenga sentido: skills fuertes + experiencia. */
export function profileIsUsable(p: JobProfile): boolean {
  return Boolean(p.jobSkillsStrong.trim() && p.jobExperience.trim());
}

// ---------- Resultado ----------

export const GATE_VERDICTS = ["PASS", "FLAG", "FAIL", "UNVERIFIED"] as const;
export type GateVerdict = (typeof GATE_VERDICTS)[number];

export const FIT_DIMENSIONS = [
  { key: "technical", label: "Skills técnicas", weight: 0.3 },
  { key: "experience", label: "Experiencia", weight: 0.25 },
  { key: "culture", label: "Cultura / forma de trabajo", weight: 0.15 },
  { key: "career", label: "Carrera y motivación", weight: 0.3 },
] as const;
export type FitDimension = (typeof FIT_DIMENSIONS)[number]["key"];

export const FIT_GATES = [
  { key: "eligibility", label: "Permiso de trabajo" },
  { key: "language", label: "Idioma" },
  { key: "location", label: "Ubicación" },
] as const;
export type FitGate = (typeof FIT_GATES)[number]["key"];

const verdict = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  z.enum(GATE_VERDICTS).catch("UNVERIFIED")
);
const text = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, max) : ""),
    z.string()
  );
const score = z.preprocess((v) => {
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n)
    ? Math.round(Math.min(100, Math.max(0, n)))
    : null;
}, z.number().nullable());
const list = z.preprocess(
  (v) =>
    Array.isArray(v)
      ? v
          .filter((x) => typeof x === "string" && x.trim())
          .map((x: string) => x.trim().slice(0, 240))
          .slice(0, 5)
      : [],
  z.array(z.string())
);

const gate = z
  .object({ verdict: verdict, quote: text(240), note: text(240) })
  .catch({ verdict: "UNVERIFIED", quote: "", note: "" });
const dim = z
  .object({ score: score, note: text(240) })
  .catch({ score: null, note: "" });

/** Lo que devuelve el modelo, normalizado y tolerante (un LLM chico se desordena). */
export const RawFitSchema = z.object({
  gates: z
    .object({ eligibility: gate, language: gate, location: gate })
    .catch({
      eligibility: { verdict: "UNVERIFIED", quote: "", note: "" },
      language: { verdict: "UNVERIFIED", quote: "", note: "" },
      location: { verdict: "UNVERIFIED", quote: "", note: "" },
    }),
  scores: z
    .object({ technical: dim, experience: dim, culture: dim, career: dim })
    .catch({
      technical: { score: null, note: "" },
      experience: { score: null, note: "" },
      culture: { score: null, note: "" },
      career: { score: null, note: "" },
    }),
  strengths: list,
  gaps: list,
  recommendation: text(500),
});
export type RawFit = z.infer<typeof RawFitSchema>;

export type FitVerdict =
  | "blocked"
  | "strong"
  | "good"
  | "moderate"
  | "weak"
  | "poor";

export const FIT_VERDICT_LABELS: Record<FitVerdict, string> = {
  blocked: "No pasa los filtros",
  strong: "Fit fuerte",
  good: "Buen fit",
  moderate: "Fit dudoso",
  weak: "Fit débil",
  poor: "No conviene",
};

export const FIT_VERDICT_ADVICE: Record<FitVerdict, string> = {
  blocked: "Un filtro duro no pasa: no inviertas tiempo acá salvo que sepas algo que el aviso no dice.",
  strong: "Postulate y adaptá todo a este aviso.",
  good: "Postulate y cubrí las brechas en la carta.",
  moderate: "Pensalo bien: ¿hay una razón estratégica?",
  weak: "Probablemente no, salvo una razón estratégica.",
  poor: "Pasala y guardá la energía para otra.",
};

/** Reporte final que se guarda en Opportunity.fitReport (JSON). */
export type FitReport = RawFit & {
  /** null = bloqueada por un filtro o sin puntajes suficientes. */
  overall: number | null;
  verdict: FitVerdict;
  evaluatedAt: string;
};

/** Promedio ponderado (30/25/15/30) sobre las dimensiones con puntaje. */
export function weightedScore(scores: RawFit["scores"]): number | null {
  let sum = 0;
  let weights = 0;
  for (const d of FIT_DIMENSIONS) {
    const s = scores[d.key].score;
    if (s == null) continue;
    sum += s * d.weight;
    weights += d.weight;
  }
  // Con menos de la mitad del peso puntuado, el número no significa nada.
  return weights >= 0.5 ? Math.round(sum / weights) : null;
}

export function verdictFor(overall: number | null, blocked: boolean): FitVerdict {
  if (blocked || overall == null) return "blocked";
  if (overall >= 75) return "strong";
  if (overall >= 60) return "good";
  if (overall >= 45) return "moderate";
  if (overall >= 30) return "weak";
  return "poor";
}

/** Normaliza la respuesta del modelo y calcula puntaje + veredicto. */
export function buildFitReport(raw: unknown, now: Date): FitReport {
  const fit = RawFitSchema.parse(raw ?? {});
  const blocked = FIT_GATES.some((g) => fit.gates[g.key].verdict === "FAIL");
  const overall = blocked ? null : weightedScore(fit.scores);
  return {
    ...fit,
    overall,
    verdict: verdictFor(overall, blocked),
    evaluatedAt: now.toISOString(),
  };
}

/** Lee el JSON guardado sin romper si está corrupto o es de otra versión. */
export function parseStoredFit(json: string | null | undefined): FitReport | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as Partial<FitReport>;
    const report = buildFitReport(obj, new Date(obj.evaluatedAt ?? Date.now()));
    return { ...report, evaluatedAt: obj.evaluatedAt ?? report.evaluatedAt };
  } catch {
    return null;
  }
}

// ---------- Prompt ----------

export function buildFitPrompt(input: {
  title: string;
  company: string | null;
  location: string | null;
  jobDescription: string;
  profile: JobProfile;
}): { system: string; prompt: string } {
  const p = input.profile;
  const line = (label: string, v: string) => `${label}: ${v.trim() || "(sin dato)"}`;

  const system = [
    "Sos un evaluador de búsqueda laboral honesto y concreto. Evaluás si un aviso le conviene a un candidato, comparando el aviso con su perfil. Nunca inventás datos que no estén en el aviso o en el perfil.",
    "",
    "PASO 1 — FILTROS (antes de puntuar). Para cada uno, citá textual la frase del aviso que lo decide (o dejá quote vacío si el aviso no dice nada):",
    "- eligibility (permiso de trabajo): FAIL si el aviso exige ciudadanía, residencia o permiso que el candidato no tiene, o una habilitación de seguridad. PASS si dice explícitamente que acepta su situación (ej. remoto internacional, contractor, sponsor). UNVERIFIED si no dice nada: el silencio NO es permiso.",
    "- language (idioma): fijate el idioma que el ROL exige para trabajar, no el idioma en que está escrito el aviso. FAIL si exige un idioma que el candidato no declara. FLAG si lo declara pero el nivel pedido (\"fluido\", \"nativo\", C1) parece mayor al suyo. PASS si está a su nivel o no especifica nivel.",
    "- location (ubicación): FAIL si exige mudarse y el candidato no se muda. FLAG si pide viajes frecuentes o presencialidad que choca con su modalidad. PASS si es compatible.",
    "",
    "PASO 2 — PUNTAJES 0-100 (aunque un filtro dé FAIL, puntuá igual):",
    "- technical: 80-100 los requisitos centrales son skills fuertes; 60-79 la mayoría coincide con 1-2 brechas aprendibles; 40-59 coincidencia parcial; 0-39 no coincide.",
    "- experience: compará la FUNCIÓN y el tipo de trabajo, no el título literal. 80-100 experiencia directa en el mismo dominio y rol; 60-79 relacionada y transferible; 40-59 adyacente; 0-39 sin relación.",
    "- culture: forma de trabajo y cultura vs lo que lo energiza/drena. 80-100 encaja fuerte; 60-79 señales mixtas pero compatible; 40-59 fricción; 0-39 choque.",
    "- career: ¿lo acerca a sus objetivos y tiene tareas que lo energizan? 80-100 muy alineado; 60-79 parcialmente; 40-59 no construye hacia sus metas; 0-39 retroceso.",
    "",
    "PASO 3 — strengths (hasta 3 fortalezas concretas para ESTE aviso), gaps (hasta 3 brechas a cubrir), recommendation (1-2 frases: postularse, no, o postularse con salvedades).",
    "",
    'Respondé SOLO con un objeto JSON, sin texto antes ni después, con esta forma exacta: {"gates":{"eligibility":{"verdict":"PASS|FLAG|FAIL|UNVERIFIED","quote":"","note":""},"language":{...},"location":{...}},"scores":{"technical":{"score":0,"note":""},"experience":{...},"culture":{...},"career":{...}},"strengths":[""],"gaps":[""],"recommendation":""}. Las notas, en español y de una línea.',
    INJECTION_GUARD,
  ].join("\n");

  const prompt = [
    "--- PERFIL DEL CANDIDATO ---",
    userData(
      [
        line("Skills fuertes", p.jobSkillsStrong),
        line("Skills intermedias", p.jobSkillsMedium),
        line("Lo que le falta", p.jobSkillsWeak),
        line("Experiencia", p.jobExperience),
        line("Objetivos de carrera", p.jobGoals),
        line("Energía (lo que lo energiza / drena)", p.jobEnergy),
        line("Idiomas", p.jobLanguages),
        line("Permiso de trabajo", p.jobWorkRights),
        line("Ubicación y modalidad", p.jobLocation),
      ].join("\n"),
      3000
    ),
    "",
    "--- AVISO ---",
    `Puesto: ${input.title}${input.company ? ` en ${input.company}` : ""}${input.location ? ` · ${input.location}` : ""}`,
    userData(input.jobDescription, 6000),
  ].join("\n");

  return { system, prompt };
}
