"use client";

// Envoltorios cliente de los <Editable*> para los campos de Contacto que se
// muestran como Badge (ver nota en oportunidades/inline-editors.tsx).

import { EditableSelect } from "@/components/editable/editable-select";
import { StrengthBadge } from "@/components/badges";
import { patchContactField } from "@/app/(app)/contactos/actions";
import {
  RELATIONSHIP_STRENGTHS,
  relationshipStrengthLabels,
} from "@/lib/labels";
import type { RelationshipStrength } from "@/lib/generated/prisma/client";

export function ContactStrengthSelect({
  id,
  value,
}: {
  id: string;
  value: RelationshipStrength;
}) {
  return (
    <EditableSelect
      value={value}
      ariaLabel="Cambiar fuerza de la relación"
      options={RELATIONSHIP_STRENGTHS.map((s) => ({
        value: s,
        label: relationshipStrengthLabels[s],
      }))}
      renderValue={(v) => <StrengthBadge strength={v as RelationshipStrength} />}
      onSave={(v) => patchContactField(id, "relationshipStrength", v)}
    />
  );
}
