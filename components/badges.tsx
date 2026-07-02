import { Badge } from "@/components/ui/badge";
import {
  priorityLabels,
  relationshipStrengthLabels,
  touchpointTypeLabels,
} from "@/lib/labels";
import {
  stageBadgeClass,
  stageLabel,
  badgeClassFor,
  labelFor,
  getVocab,
  type Track,
  type StageDef,
} from "@/lib/tracks";
import type {
  Priority,
  RelationshipStrength,
  TouchpointType,
} from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

export function StageBadge({
  stage,
  track = "jobs",
  stages,
}: {
  stage: string;
  track?: Track;
  /** Etapas reales del track (desde DB). Sin esto, cae a los presets. */
  stages?: StageDef[];
}) {
  const className = stages
    ? badgeClassFor(stages, stage)
    : stageBadgeClass(track, stage);
  const label = stages ? labelFor(stages, stage) : stageLabel(track, stage);
  return (
    <Badge variant="secondary" className={cn("border-0", className)}>
      {label}
    </Badge>
  );
}

// Paleta comic: borde de tinta + colores de la marca. Contraste AA en todos:
// ink sobre paper/komic, paper sobre hero/alarm.
const priorityStyles: Record<Priority, string> = {
  LOW: "border-2 border-ink bg-paper text-ink",
  MEDIUM: "border-2 border-ink bg-hero text-paper",
  HIGH: "border-2 border-ink bg-alarm text-paper",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="secondary" className={cn(priorityStyles[priority])}>
      {priorityLabels[priority]}
    </Badge>
  );
}

const strengthStyles: Record<RelationshipStrength, string> = {
  COLD: "border-2 border-ink bg-muted text-ink",
  WARM: "border-2 border-ink bg-komic text-ink",
  STRONG: "border-2 border-ink bg-hero text-paper",
};

export function StrengthBadge({
  strength,
}: {
  strength: RelationshipStrength;
}) {
  return (
    <Badge variant="secondary" className={cn(strengthStyles[strength])}>
      {relationshipStrengthLabels[strength]}
    </Badge>
  );
}

export function TouchpointTypeBadge({ type }: { type: TouchpointType }) {
  return <Badge variant="outline">{touchpointTypeLabels[type]}</Badge>;
}

// Insignia del modo/track al que pertenece una entidad (emoji + nombre). Sirve
// para diferenciar de un vistazo contactos de distintos modos en una vista
// compartida.
export function TrackBadge({ track }: { track: Track }) {
  const v = getVocab(track);
  return (
    <Badge variant="outline" className="gap-1 border-2 border-ink">
      <span className="leading-none">{v.emoji}</span>
      {v.name}
    </Badge>
  );
}
