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
