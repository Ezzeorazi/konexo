import { z } from "zod";

// Validación de formas con Zod (auditoría M4 / Prioridad 3). Prisma ya
// parametriza las queries (no hay SQL injection), pero validamos los inputs de
// las Server Actions y el route handler para no guardar basura ni payloads
// gigantes, y para rechazar enums/formatos inválidos venидos de un caller
// malicioso (las Server Actions son endpoints públicos: no alcanza con la UI).
//
// Criterio: límites de largo generosos (no romper inputs legítimos) + enums
// estrictos + formato de email donde corresponde. Las URLs se max-limitan pero
// NO se validan como URL acá: el usuario tipea "acme.com" y normalizeUrl() le
// antepone https:// después; validar la URL cruda rechazaría entradas válidas.

// Texto opcional con tope de largo. "" y undefined pasan (campos vacíos).
const optionalText = (max: number) => z.string().trim().max(max).optional();
// Texto obligatorio (al menos 1 caracter tras trim).
const requiredText = (max: number) =>
  z.string().trim().min(1, "Este campo es obligatorio.").max(max);
// Email opcional: vacío o un email válido. Recortamos ANTES de validar: el
// usuario suele pegar el mail con espacios alrededor, y validarlo crudo lo
// rechazaría aunque sea válido tras el trim.
const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.union([z.literal(""), z.email("Email inválido.").max(320)]).optional()
);
// id tipo cuid (o vacío). Tope corto: estos vienen de selects, no de texto libre.
const optionalId = z.string().trim().max(64).optional();
// Fecha en formato yyyy-MM-dd (o vacío). parseDateInput() la interpreta luego.
const optionalDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")])
  .optional();

// Acepta fecha ("yyyy-MM-dd") o fecha+hora del <input datetime-local>
// ("yyyy-MM-ddTHH:mm"). Se usa en los follow-ups, que ahora llevan horario.
const optionalDateTime = z
  .union([
    z.literal(""),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "Fecha u hora inválida."),
  ])
  .optional();

export const OpportunitySchema = z.object({
  title: requiredText(200),
  track: optionalText(40),
  companyId: optionalId,
  stage: requiredText(60),
  kind: z.enum(["client", "own"]).optional(),
  accentColor: optionalText(30),
  accentEmoji: optionalText(20),
  url: optionalText(2000),
  location: optionalText(200),
  salaryRange: optionalText(120),
  value: optionalText(40),
  jobDescription: optionalText(20000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  appliedAt: optionalDate,
  nextFollowUpAt: optionalDateTime,
  cvVersionId: optionalId,
  notes: optionalText(20000),
});

export const ContactSchema = z.object({
  name: requiredText(200),
  track: optionalText(40),
  role: optionalText(200),
  companyId: optionalId,
  email: optionalEmail,
  linkedinUrl: optionalText(2000),
  phone: optionalText(60),
  relationshipStrength: z.enum(["COLD", "WARM", "STRONG"]),
  nextFollowUpAt: optionalDateTime,
  notes: optionalText(20000),
});

export const CompanySchema = z.object({
  name: requiredText(200),
  track: optionalText(40),
  website: optionalText(2000),
  location: optionalText(200),
  industry: optionalText(200),
  source: optionalText(200),
  notes: optionalText(20000),
});

export const CVVersionSchema = z.object({
  label: requiredText(200),
  fileName: optionalText(300),
  content: optionalText(100000),
  notes: optionalText(20000),
});

export const TouchpointSchema = z.object({
  type: z.enum(["EMAIL", "LINKEDIN", "CALL", "MEETING", "REFERRAL_ASK", "NOTE", "IDEA", "AVANCE"]),
  note: optionalText(20000),
  occurredAt: optionalDate,
  contactId: optionalId,
  opportunityId: optionalId,
});

export const ProjectTaskSchema = z.object({
  opportunityId: requiredText(64),
  title: requiredText(300),
});

export const ProjectTaskUpdateSchema = z.object({
  title: requiredText(300),
});

// Edición in-context de un touchpoint: cada campo es opcional (se guardan de a
// uno desde los editores inline), pero si viene, se valida.
export const TouchpointUpdateSchema = z.object({
  type: z
    .enum(["EMAIL", "LINKEDIN", "CALL", "MEETING", "REFERRAL_ASK", "NOTE", "IDEA", "AVANCE"])
    .optional(),
  note: optionalText(20000),
  occurredAt: optionalDate,
});

export const StageSchema = z.object({
  label: requiredText(120),
  type: z.string().max(20),
  probability: z.coerce.number().int().min(0).max(100).catch(0),
});

export const WaitlistSchema = z.object({
  // Igual que optionalEmail: recortamos antes de validar (espacios alrededor no
  // deben invalidar un email por lo demás correcto).
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.email("Email inválido.").max(320)
  ),
  source: optionalText(40),
});

/** Mensaje en español del primer problema de validación, para mostrar al usuario. */
export function firstZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Datos inválidos.";
  switch (issue.code) {
    case "too_big":
      return "Un campo supera el largo máximo permitido.";
    case "too_small":
      return issue.message || "Falta completar un campo obligatorio.";
    case "invalid_format":
      return issue.message || "Hay un campo con formato inválido.";
    case "invalid_value":
      return "Hay un valor no permitido en el formulario.";
    default:
      return issue.message || "Datos inválidos.";
  }
}
