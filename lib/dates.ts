import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date) {
  return format(date, "d MMM yyyy", { locale: es });
}

export function formatRelative(date: Date) {
  return formatDistanceToNow(date, { locale: es, addSuffix: true });
}

export function toDateInputValue(date: Date | null | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

// "yyyy-MM-dd" del input date → Date en horario local (sin corrimiento UTC)
export function parseDateInput(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}
