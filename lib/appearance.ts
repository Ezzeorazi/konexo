// Personalización visual de proyectos PROPIOS (Opportunity.kind = "own").
// Una paleta chica de acentos y un set de emojis sugeridos. Las clases son
// literales (no se arman en runtime) para que Tailwind las incluya en el build.

export type OwnAccent = {
  key: string;
  label: string;
  /** Franja/acento sólido (borde izquierdo de la card, punto). */
  stripe: string;
  /** Chip "PROPIO" (fondo + texto). */
  badge: string;
  /** Swatch en el selector. */
  swatch: string;
};

export const OWN_ACCENTS: OwnAccent[] = [
  {
    key: "indigo",
    label: "Índigo",
    stripe: "bg-hero",
    badge: "bg-hero text-paper",
    swatch: "bg-hero",
  },
  {
    key: "amarillo",
    label: "Amarillo",
    stripe: "bg-komic",
    badge: "bg-komic text-ink",
    swatch: "bg-komic",
  },
  {
    key: "rojo",
    label: "Rojo",
    stripe: "bg-alarm",
    badge: "bg-alarm text-paper",
    swatch: "bg-alarm",
  },
  {
    key: "azul",
    label: "Azul",
    stripe: "bg-blue-500",
    badge: "bg-blue-500 text-white",
    swatch: "bg-blue-500",
  },
  {
    key: "verde",
    label: "Verde",
    stripe: "bg-emerald-500",
    badge: "bg-emerald-500 text-white",
    swatch: "bg-emerald-500",
  },
  {
    key: "violeta",
    label: "Violeta",
    stripe: "bg-violet-500",
    badge: "bg-violet-500 text-white",
    swatch: "bg-violet-500",
  },
];

export const DEFAULT_OWN_ACCENT = OWN_ACCENTS[0];

/** Resuelve la clave guardada a un acento (cae al default si no matchea). */
export function getOwnAccent(key: string | null | undefined): OwnAccent {
  return OWN_ACCENTS.find((a) => a.key === key) ?? DEFAULT_OWN_ACCENT;
}

/** Emojis sugeridos para etiquetar un proyecto propio. */
export const OWN_EMOJIS = [
  "🚀",
  "💡",
  "🎨",
  "🛠️",
  "📚",
  "🎯",
  "🔥",
  "🌱",
  "🎮",
  "✍️",
  "🎬",
  "🧪",
];

export const DEFAULT_OWN_EMOJI = "🚀";
