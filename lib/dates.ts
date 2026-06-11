import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date) {
  return format(date, "d MMM yyyy", { locale: es });
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
