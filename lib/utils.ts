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

// Parsea un monto tipeado por el usuario a número, tolerando símbolos de moneda,
// espacios y separadores de miles/decimales en formato AR ("1.500,50") o US
// ("1,500.50"). Devuelve null si no hay número.
//
// Heurística: si aparecen los DOS separadores, el ÚLTIMO es el decimal y el otro
// es de miles. Si aparece uno solo repetido (1.500.000) son todos de miles. Un
// único separador se interpreta como decimal (1500,50 y 1500.50 → 1500.5). El
// caso de un solo separador con 3 dígitos ("1.500") es ambiguo y queda como
// decimal, igual que antes: no empeora nada y evita adivinar de más.
export function parseMoney(value?: string | null): number | null {
  const cleaned = (value ?? "").replace(/[^\d.,-]/g, "")
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(",")
  const lastDot = cleaned.lastIndexOf(".")

  let normalized: string
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? "," : "."
    const thousandsSep = decimalSep === "," ? "." : ","
    normalized = cleaned.split(thousandsSep).join("").replace(decimalSep, ".")
  } else {
    const sep = lastComma !== -1 ? "," : lastDot !== -1 ? "." : ""
    if (sep && cleaned.split(sep).length > 2) {
      normalized = cleaned.split(sep).join("") // separador repetido = miles
    } else {
      normalized = cleaned.replace(",", ".") // único separador = decimal
    }
  }

  const n = Number(normalized)
  return Number.isNaN(n) ? null : n
}
