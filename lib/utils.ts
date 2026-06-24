import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "axondigital.mx" → "https://axondigital.mx"; respeta esquemas ya presentes.
export function normalizeUrl(value?: string): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
