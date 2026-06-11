import { Badge } from "@/components/ui/badge";
import {
  stageLabels,
  priorityLabels,
  relationshipStrengthLabels,
  touchpointTypeLabels,
} from "@/lib/labels";
import type {
  Stage,
  Priority,
  RelationshipStrength,
  TouchpointType,
} from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

const stageStyles: Record<Stage, string> = {
  SAVED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  APPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  INTERVIEW:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  OFFER:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge variant="secondary" className={cn("border-0", stageStyles[stage])}>
      {stageLabels[stage]}
    </Badge>
  );
}

const priorityStyles: Record<Priority, string> = {
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  MEDIUM: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  HIGH: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", priorityStyles[priority])}
    >
      {priorityLabels[priority]}
    </Badge>
  );
}

const strengthStyles: Record<RelationshipStrength, string> = {
  COLD: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  WARM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  STRONG:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function StrengthBadge({
  strength,
}: {
  strength: RelationshipStrength;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", strengthStyles[strength])}
    >
      {relationshipStrengthLabels[strength]}
    </Badge>
  );
}

export function TouchpointTypeBadge({ type }: { type: TouchpointType }) {
  return <Badge variant="outline">{touchpointTypeLabels[type]}</Badge>;
}
