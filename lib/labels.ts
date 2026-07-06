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
  // Actividad interna (ex-bitácora, Fase 3): notas de ejecución, sin persona.
  "IDEA",
  "AVANCE",
];

export const touchpointTypeLabels: Record<TouchpointType, string> = {
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
  CALL: "Llamada",
  MEETING: "Reunión",
  REFERRAL_ASK: "Pedido de referido",
  NOTE: "Nota",
  IDEA: "Idea",
  AVANCE: "Avance",
};

// Subconjunto de tipos que son ACTIVIDAD INTERNA (ex-bitácora): no son
// interacciones con una persona, sino notas de ejecución del proyecto.
export const INTERNAL_TOUCHPOINT_TYPES: TouchpointType[] = ["IDEA", "AVANCE"];

// Nota (Fase 3): la bitácora (ProjectNote, kinds "idea"/"avance") se fusionó en
// el stream de Actividad como tipos de Touchpoint IDEA/AVANCE. Sus labels viven
// ahora en `touchpointTypeLabels`; `ProjectNoteKind`/`projectNoteKindLabels` se
// eliminaron.

// Tipo de proyecto (track con hasDelivery). No es un enum de Prisma: el campo
// `kind` en Opportunity es String, lo acotamos acá y en validation.ts.
// "own" = proyecto propio (lo trabajás vos); "client" = trabajo para un cliente.
export type ProjectKind = "client" | "own";

export const PROJECT_KINDS: ProjectKind[] = ["client", "own"];

export const projectKindLabels: Record<ProjectKind, string> = {
  client: "De un cliente",
  own: "Propio",
};
