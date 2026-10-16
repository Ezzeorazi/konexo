// Chequeo de legibilidad ATS de un CV, sobre el TEXTO extraído del PDF.
//
// Idea tomada del paso "ATS & keyword verification" de ai-job-search
// (github.com/MadsLorentzen/ai-job-search, MIT): un ATS no "mira" el PDF, lee su
// capa de texto. Si al extraerla salen símbolos rotos, falta el email o las
// fechas vienen pegadas con guiones Unicode, el ATS ve lo mismo. Konexo extrae
// ese texto al subir el PDF, así que el chequeo es gratis (sin IA) y honesto.

export type AtsIssue = {
  level: "error" | "warn";
  message: string;
};

export type AtsCheck = {
  issues: AtsIssue[];
  words: number;
  /** El texto parece legible por un ATS (sin errores; puede tener avisos). */
  readable: boolean;
};

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
// Candidato a teléfono: dígitos con separadores típicos (+54 9 11 5555-5555,
// (011) 4444-4444). Se descartan los rangos de años ("2019-2023"), que si no
// pasan por teléfono.
const PHONE_CANDIDATE_RE = /\+?\(?\d[\d\s().-]{6,}\d/g;
const YEAR_RANGE_RE = /^(19|20)\d{2}(19|20)\d{2}$/;

function hasPhone(text: string): boolean {
  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 8 && !YEAR_RANGE_RE.test(digits)) return true;
  }
  return false;
}
// Año pegado a un guion Unicode (–, —, ‒, −) con otro año o "actualidad".
const UNICODE_DATE_DASH_RE =
  /\b(19|20)\d{2}\s*[‒–—−]\s*((19|20)\d{2}|actual|presente|hoy|present|now)/i;
const SECTION_RES = [
  /experiencia|experience|trayectoria/i,
  /educaci[oó]n|education|formaci[oó]n|estudios/i,
  /skills|habilidades|competencias|conocimientos|tecnolog/i,
];

/** Texto con menos de esto es casi seguro un PDF escaneado (imagen). */
export const MIN_READABLE_CHARS = 200;

export function atsCheck(raw: string): AtsCheck {
  const text = raw ?? "";
  const words = text.split(/\s+/).filter(Boolean).length;
  const issues: AtsIssue[] = [];

  if (text.trim().length < MIN_READABLE_CHARS) {
    issues.push({
      level: "error",
      message:
        "Casi no se pudo extraer texto: el PDF parece escaneado o exportado como imagen. Un ATS no lo va a poder leer. Exportalo desde Word/Docs/Canva como PDF con texto.",
    });
    return { issues, words, readable: false };
  }

  const broken = (text.match(/�|\(cid:\d+\)/g) ?? []).length;
  if (broken > 3) {
    issues.push({
      level: "error",
      message: `Hay ${broken} caracteres que no se pudieron leer (símbolos rotos). Suele pasar con fuentes raras o íconos: un ATS los ve como basura.`,
    });
  }

  if (!EMAIL_RE.test(text)) {
    issues.push({
      level: "error",
      message:
        "No encontré tu email como texto. Si está solo como ícono o link, un ATS no lo ve: escribilo completo.",
    });
  }
  if (!hasPhone(text)) {
    issues.push({
      level: "warn",
      message: "No encontré un teléfono como texto.",
    });
  }

  if (UNICODE_DATE_DASH_RE.test(text)) {
    issues.push({
      level: "warn",
      message:
        "Hay fechas con guion largo (ej. 2019–2023). Algunos ATS pierden la fecha: usá un guion común (2019-2023).",
    });
  }

  const missingSections = SECTION_RES.filter((re) => !re.test(text)).length;
  if (missingSections >= 2) {
    issues.push({
      level: "warn",
      message:
        "No reconozco secciones estándar (Experiencia, Educación, Skills). Los ATS se orientan por esos títulos.",
    });
  }

  // Diseño a columnas: al extraer, las columnas se intercalan y quedan muchas
  // líneas de 1-2 palabras.
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const tiny = lines.filter((l) => l.split(/\s+/).length <= 2).length;
  if (lines.length >= 20 && tiny / lines.length > 0.55) {
    issues.push({
      level: "warn",
      message:
        "Muchas líneas sueltas de una o dos palabras: puede ser un diseño a columnas que el ATS lee mezclado. Revisá que el orden del texto tenga sentido.",
    });
  }

  if (words > 1200) {
    issues.push({
      level: "warn",
      message: `Tiene unas ${words} palabras: probablemente más de 2 páginas. Apuntá a 1-2.`,
    });
  }

  return {
    issues,
    words,
    readable: !issues.some((i) => i.level === "error"),
  };
}

/** Normaliza el texto extraído: espacios de más y saltos repetidos. */
export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ") // espacios, tabs y NBSP (no saltos)
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
