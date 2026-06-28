import type {
  Priority,
  RelationshipStrength,
  TouchpointType,
} from "@/lib/generated/prisma/client";

// Las etapas (Stage) ahora son por-track y viven en lib/tracks.ts.
export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

export const priorityLabels: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export const RELATIONSHIP_STRENGTHS: RelationshipStrength[] = [
  "COLD",
  "WARM",
  "STRONG",
];

export const relationshipStrengthLabels: Record<RelationshipStrength, string> =
  {
    COLD: "Frío",
    WARM: "Tibio",
    STRONG: "Fuerte",
  };

export const TOUCHPOINT_TYPES: TouchpointType[] = [
  "EMAIL",
  "LINKEDIN",
  "CALL",
  "MEETING",
  "REFERRAL_ASK",
  "NOTE",
];

export const touchpointTypeLabels: Record<TouchpointType, string> = {
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
  CALL: "Llamada",
  MEETING: "Reunión",
  REFERRAL_ASK: "Pedido de referido",
  NOTE: "Nota",
};

// Bitácora de ejecución del proyecto (track con hasDelivery). No es un enum de
// Prisma: el campo `kind` es String, lo acotamos acá y en validation.ts.
export type ProjectNoteKind = "idea" | "avance";

export const PROJECT_NOTE_KINDS: ProjectNoteKind[] = ["idea", "avance"];

export const projectNoteKindLabels: Record<ProjectNoteKind, string> = {
  idea: "Idea",
  avance: "Avance",
};

// Tipo de proyecto (track con hasDelivery). No es un enum de Prisma: el campo
// `kind` en Opportunity es String, lo acotamos acá y en validation.ts.
// "own" = proyecto propio (lo trabajás vos); "client" = trabajo para un cliente.
export type ProjectKind = "client" | "own";

export const PROJECT_KINDS: ProjectKind[] = ["client", "own"];

export const projectKindLabels: Record<ProjectKind, string> = {
  client: "De un cliente",
  own: "Propio",
};
