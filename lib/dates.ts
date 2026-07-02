import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date) {
  return format(date, "d MMM yyyy", { locale: es });
}

// Con hora, para follow-ups/recordatorios. Si la hora es medianoche exacta
// (follow-up viejo, sin hora elegida) mostramos solo la fecha.
export function formatDateTime(date: Date) {
  const atMidnight =
    date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
  return atMidnight
    ? formatDate(date)
    : format(date, "d MMM yyyy, HH:mm", { locale: es });
}

// Estricta: "hace 3 días" / "en 2 días", sin el "alrededor de"
export function formatRelative(date: Date) {
  return formatDistanceToNowStrict(date, { locale: es, addSuffix: true });
}

// Para follow-ups pasados: "vencido hace 3 días"
export function formatOverdue(date: Date) {
  return `vencido ${formatRelative(date)}`;
}

export function toDateInputValue(date: Date | null | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

// "yyyy-MM-dd" del input date → Date en horario local (sin corrimiento UTC)
export function parseDateInput(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

// Date → "yyyy-MM-ddTHH:mm" para <input type="datetime-local"> (horario local)
export function toDateTimeInputValue(date: Date | null | undefined) {
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : "";
}

// Valor de un input date/datetime-local → Date local. Si viene solo la fecha
// (sin hora) asume las 09:00, hora sensata por defecto para un recordatorio.
export function parseDateTimeInput(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T09:00`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}
