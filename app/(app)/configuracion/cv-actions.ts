"use server";

import { extractText, getDocumentProxy } from "unpdf";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { generateAiText } from "@/lib/ai";
import { atsCheck, cleanExtractedText, type AtsCheck } from "@/lib/cv-ats";
import { buildCvAnalysisPrompt } from "@/lib/cv-prompts";
import { getJobProfile } from "@/lib/job-profile";
import { profileIsUsable } from "@/lib/fit";

/** Tope del PDF. Vercel corta el body de una función en ~4.5 MB. */
const MAX_PDF_BYTES = 4 * 1024 * 1024;

export type PdfExtractResult =
  | { ok: true; text: string; pages: number; fileName: string; ats: AtsCheck }
  | { ok: false; error: string };

/**
 * Sube un PDF de CV y devuelve su TEXTO (el PDF no se guarda: solo el texto,
 * que el usuario revisa antes de guardar la versión). Además corre el chequeo
 * de legibilidad ATS sobre esa misma extracción.
 */
export async function extractCvFromPdf(form: FormData): Promise<PdfExtractResult> {
  await currentUserId(); // solo usuarios logueados
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No llegó ningún archivo." };
  if (file.size === 0) return { ok: false, error: "El archivo está vacío." };
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: "El PDF pesa más de 4 MB. Exportalo más liviano." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Firma "%PDF": no confiamos en la extensión ni en el MIME que manda el browser.
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    return { ok: false, error: "El archivo no es un PDF válido." };
  }

  try {
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const clean = cleanExtractedText(text);
    return {
      ok: true,
      text: clean,
      pages: totalPages,
      fileName: file.name.slice(0, 300),
      ats: atsCheck(clean),
    };
  } catch {
    return {
      ok: false,
      error: "No pude leer el PDF (¿tiene contraseña o está dañado?).",
    };
  }
}

/** Chequeo ATS sobre un texto ya cargado (sin IA, instantáneo). */
export async function checkCvText(text: string): Promise<AtsCheck> {
  return atsCheck(typeof text === "string" ? text : "");
}

/** "Analizar CV": crítica honesta del CV en general (sin aviso), con IA. */
export async function analyzeCv(
  cvVersionId: string
): Promise<{ ok: true; text: string; ats: AtsCheck } | { ok: false; error: string }> {
  if (typeof cvVersionId !== "string") return { ok: false, error: "Datos inválidos." };
  const userId = await currentUserId();
  const cv = await prisma.cVVersion.findFirst({
    where: { id: cvVersionId, userId },
    select: { content: true },
  });
  if (!cv) return { ok: false, error: "No encontré esa versión de CV." };
  if (!cv.content?.trim()) {
    return {
      ok: false,
      error: "Esta versión no tiene texto. Subí el PDF o pegá el contenido.",
    };
  }
  const ats = atsCheck(cv.content);
  const profile = await getJobProfile();
  const res = await generateAiText({
    surface: "cv",
    ...buildCvAnalysisPrompt({
      cv: cv.content,
      ats,
      profile: profileIsUsable(profile) ? profile : null,
    }),
  });
  return res.ok ? { ok: true, text: res.text, ats } : res;
}
