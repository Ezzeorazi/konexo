"use client";

// Envoltorios cliente de los <Editable*> para los campos de Oportunidad que se
// muestran como Badge. Existen porque la prop `renderValue` es una función y no
// se puede pasar desde un Server Component; acá también atamos la Server Action.

import { EditableSelect } from "@/components/editable/editable-select";
import { StageBadge, PriorityBadge } from "@/components/badges";
import { patchOpportunityField } from "@/app/(app)/oportunidades/actions";
import { PRIORITIES, priorityLabels } from "@/lib/labels";
import type { Track, StageDef } from "@/lib/tracks";
import type { Priority } from "@/lib/generated/prisma/client";

export function OppStageSelect({
  id,
  value,
  track,
  stages,
}: {
  id: string;
  value: string;
  track: Track;
  stages: StageDef[];
}) {
  return (
    <EditableSelect
      value={value}
      ariaLabel="Cambiar etapa"
      options={stages.map((s) => ({ value: s.key, label: s.label }))}
      renderValue={(v) => <StageBadge stage={v} track={track} stages={stages} />}
      onSave={(v) => patchOpportunityField(id, "stage", v)}
    />
  );
}

export function OppPrioritySelect({
  id,
  value,
}: {
  id: string;
  value: Priority;
}) {
  return (
    <EditableSelect
      value={value}
      ariaLabel="Cambiar prioridad"
      options={PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p] }))}
      renderValue={(v) => <PriorityBadge priority={v as Priority} />}
      onSave={(v) => patchOpportunityField(id, "priority", v)}
    />
  );
}
