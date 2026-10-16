import { INJECTION_GUARD, userData } from "@/lib/prompt-safety";
import type { AtsCheck } from "@/lib/cv-ats";
import type { JobProfile } from "@/lib/fit";

// Prompts de CV (Fase 3, modo empleo). Condensados de ai-job-search
// (github.com/MadsLorentzen/ai-job-search, MIT): 03-writing-style.md (reglas de
// redacción) y /apply (redactor → revisor → corrector, cobertura de requisitos,
// auditoría de que nada sea inventado). Pensados para un modelo chico (Groq).

/** Reglas de redacción comunes al análisis, al redactor y al revisor. */
const STYLE_RULES = [
  "REGLAS DE REDACCIÓN:",
  "- Nada de clichés ni relleno (\"apasionado por\", \"proactivo\", \"trabajo en equipo\", \"orientado a resultados\", \"sinergia\").",
  "- Cada afirmación con una prueba concreta: herramienta, número, resultado.",
  "- Nada de lenguaje que pide perdón (\"creo que podría aportar\"): \"aporto X, como muestra Y\".",
  "- Bullets que arrancan con verbo de acción y terminan en un resultado. Variá la estructura.",
  "- Primera persona implícita y voz activa.",
  "- Reencuadrar el énfasis está bien; cambiar los hechos NO. Prueba de la entrevista: ¿podría explicar este bullet en una entrevista sin tener que decir \"bueno, en realidad...\"? Si no, es demasiado.",
  "- NUNCA inventes experiencia, empresas, fechas, títulos ni números que no estén en el CV o el perfil.",
].join("\n");

const profileBlock = (p: JobProfile | null) =>
  p
    ? userData(
        [
          `Skills fuertes: ${p.jobSkillsStrong || "(sin dato)"}`,
          `Skills intermedias: ${p.jobSkillsMedium || "(sin dato)"}`,
          `Lo que le falta: ${p.jobSkillsWeak || "(sin dato)"}`,
          `Experiencia: ${p.jobExperience || "(sin dato)"}`,
          `Objetivos: ${p.jobGoals || "(sin dato)"}`,
          `Idiomas: ${p.jobLanguages || "(sin dato)"}`,
        ].join("\n"),
        2500
      )
    : "(sin perfil cargado)";

const atsBlock = (ats: AtsCheck) =>
  ats.issues.length
    ? ats.issues.map((i) => `- [${i.level === "error" ? "ERROR" : "AVISO"}] ${i.message}`).join("\n")
    : "- Sin problemas detectados.";

// ---------- Analizar CV (sin aviso) ----------

export function buildCvAnalysisPrompt(input: {
  cv: string;
  ats: AtsCheck;
  profile: JobProfile | null;
}): { system: string; prompt: string } {
  const system = [
    "Sos un reclutador senior que revisa CVs con ojo crítico y honesto. Respondés en español, en texto plano (sin Markdown, sin asteriscos), directo y accionable.",
    STYLE_RULES,
    INJECTION_GUARD,
  ].join("\n\n");
  const prompt = [
    "--- CV ---",
    userData(input.cv, 8000),
    "",
    "--- PERFIL DECLARADO ---",
    profileBlock(input.profile),
    "",
    "--- CHEQUEO AUTOMÁTICO DE LEGIBILIDAD ATS (ya hecho, no lo repitas: usalo) ---",
    atsBlock(input.ats),
    "",
    "--- TAREA ---",
    "Respondé con estas secciones, con estos títulos exactos:",
    "LO QUE FUNCIONA: 2-3 puntos concretos.",
    "A MEJORAR: hasta 6 puntos, priorizados. Para cada bullet débil mostrá ANTES → DESPUÉS, sin inventar datos (si falta un número, poné [completá: dato]).",
    "LEGIBILIDAD ATS: qué arreglar del chequeo automático, en criollo, o \"OK\" si no hay nada.",
    "RESUMEN PROFESIONAL SUGERIDO: 2-3 líneas.",
  ].join("\n");
  return { system, prompt };
}

// ---------- Adaptar CV a un aviso: redactor → revisor → corrector ----------

export type TailorInput = {
  title: string;
  company: string | null;
  jobDescription: string;
  cv: string;
  profile: JobProfile | null;
};

const SECTION_FORMAT = [
  "Respondé con EXACTAMENTE estas tres secciones, cada una arrancando con su marcador en una línea sola:",
  "===COBERTURA===",
  "Una línea por requisito importante del aviso: requisito | CUBIERTO / SINÓNIMO (usá el término del aviso) / FALTA PERO LO TENÉS (agregalo) / BRECHA REAL (no lo inventes) | dónde o por qué.",
  "===CV===",
  "El CV completo adaptado, en texto plano, listo para pegar: resumen profesional de 2-3 líneas, experiencia con bullets reescritos para este aviso (los más relevantes primero), skills con los términos del aviso cuando sean verdad, educación. Mismo idioma que el CV original.",
  "===CARTA===",
  "Carta de presentación de media página, en el idioma del aviso: por qué esta empresa (al principio), qué tareas del aviso podés resolver y cómo, 1-2 ejemplos breves, cierre seguro. Reconocé con honestidad las brechas importantes tendiendo un puente desde experiencia cercana. Sin datos de la empresa que no estén en el aviso.",
].join("\n");

const jobBlock = (i: TailorInput) =>
  [
    `Puesto: ${i.title}${i.company ? ` en ${i.company}` : ""}`,
    "--- AVISO ---",
    userData(i.jobDescription, 6000),
    "",
    "--- CV ORIGINAL (única fuente de verdad de hechos) ---",
    userData(i.cv, 8000),
    "",
    "--- PERFIL DECLARADO ---",
    profileBlock(i.profile),
  ].join("\n");

export function buildDrafterPrompt(i: TailorInput): { system: string; prompt: string } {
  return {
    system: [
      "Sos el REDACTOR: adaptás un CV y escribís una carta para un aviso concreto. Todo requisito del aviso se aborda: cubierto o reconocido con honestidad, nunca omitido en silencio.",
      STYLE_RULES,
      INJECTION_GUARD,
    ].join("\n\n"),
    prompt: [jobBlock(i), "", "--- TAREA ---", SECTION_FORMAT].join("\n"),
  };
}

export function buildReviewerPrompt(
  i: TailorInput,
  draft: string
): { system: string; prompt: string } {
  return {
    system: [
      "Sos el REVISOR: actuás como el hiring manager de este aviso y criticás el borrador del redactor para que sea lo más preciso y convincente posible. No reescribís: señalás problemas concretos. Respondés en español, en texto plano.",
      STYLE_RULES,
      INJECTION_GUARD,
    ].join("\n\n"),
    prompt: [
      jobBlock(i),
      "",
      "--- BORRADOR DEL REDACTOR ---",
      userData(draft, 10000),
      "",
      "--- TAREA ---",
      "Listá los problemas, cada uno en una línea que arranque con su categoría:",
      "[INVENTADO] algo del borrador (fecha, empresa, título, número, skill) que NO está en el CV original ni en el perfil. Es lo más grave: citá la frase.",
      "[REQUISITO] un requisito del aviso que quedó sin abordar o mal cubierto.",
      "[KEYWORD] un término del aviso que el candidato tiene pero el CV no usa literal.",
      "[ESTILO] cliché, frase pasiva o genérica, tono que pide perdón (citá y proponé el reemplazo).",
      "[CARTA] problema de la carta (genérica, repite el CV, no dice por qué esta empresa).",
      "Si una categoría no tiene problemas, escribí la categoría y \"ninguno\". No inventes problemas.",
    ].join("\n"),
  };
}

export function buildReviserPrompt(
  i: TailorInput,
  draft: string,
  review: string
): { system: string; prompt: string } {
  return {
    system: [
      "Sos el REDACTOR otra vez: aplicás la revisión a tu borrador. Corregí TODO lo marcado como [INVENTADO] (sacalo o reformulalo con lo que sí es verdad). Aplicá el resto con criterio, sin inventar nada para cubrir un requisito: una brecha real se reconoce, no se esconde.",
      STYLE_RULES,
      INJECTION_GUARD,
    ].join("\n\n"),
    prompt: [
      jobBlock(i),
      "",
      "--- TU BORRADOR ---",
      userData(draft, 10000),
      "",
      "--- REVISIÓN ---",
      userData(review, 4000),
      "",
      "--- TAREA ---",
      "Devolvé la versión final.",
      SECTION_FORMAT,
    ].join("\n"),
  };
}

export type TailorSections = {
  coverage: string;
  cv: string;
  letter: string;
};

/** Separa la respuesta en secciones por marcador; tolera marcadores con espacios o Markdown. */
export function parseTailorSections(text: string): TailorSections | null {
  const re = /^[\s#*]*={2,}\s*(COBERTURA|CV|CARTA)\s*={2,}[\s*]*$/gim;
  const marks = [...text.matchAll(re)];
  if (marks.length === 0) return null;
  const out: Record<string, string> = {};
  marks.forEach((m, idx) => {
    const start = m.index! + m[0].length;
    const end = idx + 1 < marks.length ? marks[idx + 1].index! : text.length;
    out[m[1].toUpperCase()] = text.slice(start, end).trim();
  });
  if (!out.CV) return null;
  return {
    coverage: out.COBERTURA ?? "",
    cv: out.CV,
    letter: out.CARTA ?? "",
  };
}
