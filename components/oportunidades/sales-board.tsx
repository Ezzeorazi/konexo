"use client";

import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import { Kanban, type KanbanOpportunity } from "@/components/oportunidades/kanban";
import {
  VenturesManager,
  type ManagedVenture,
} from "@/components/oportunidades/ventures-manager";
import { getOwnAccent } from "@/lib/appearance";
import type { StageDef } from "@/lib/tracks";
import { cn } from "@/lib/utils";

// Tablero de Ventas: suma sobre el Kanban una barra para segmentar el pipeline
// por emprendimiento (chips de filtro) y gestionarlos.
export function SalesBoard({
  opportunities,
  ventures,
  stages,
}: {
  opportunities: KanbanOpportunity[];
  ventures: ManagedVenture[];
  stages: StageDef[];
}) {
  // "all" = todos; "none" = sin emprendimiento; o el id de un emprendimiento.
  const [filter, setFilter] = useState<string>("all");

  const noneCount = useMemo(
    () => opportunities.filter((o) => !o.venture).length,
    [opportunities]
  );

  const shown =
    filter === "all"
      ? opportunities
      : filter === "none"
        ? opportunities.filter((o) => !o.venture)
        : opportunities.filter((o) => o.venture?.id === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Todos (${opportunities.length})`}
        />
        {ventures.map((v) => {
          const count = opportunities.filter(
            (o) => o.venture?.id === v.id
          ).length;
          const accent = getOwnAccent(v.color);
          return (
            <Chip
              key={v.id}
              active={filter === v.id}
              onClick={() => setFilter(v.id)}
              label={`${v.emoji ? `${v.emoji} ` : ""}${v.name} (${count})`}
              accentClass={accent.badge}
            />
          );
        })}
        {noneCount > 0 ? (
          <Chip
            active={filter === "none"}
            onClick={() => setFilter("none")}
            label={`Sin emprendimiento (${noneCount})`}
          />
        ) : null}

        <VenturesManager
          ventures={ventures}
          trigger={
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-background px-3 py-1 font-display text-xs tracking-wide text-ink transition-colors hover:bg-muted"
            >
              <Store className="size-4" />
              Gestionar
            </button>
          }
        />
      </div>

      <Kanban opportunities={shown} stages={stages} />
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  accentClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accentClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border-2 border-ink px-3 py-1 font-display text-xs tracking-wide transition-colors",
        active
          ? accentClass ?? "bg-komic text-ink"
          : "bg-background text-muted-foreground hover:bg-muted",
        active && "shadow-[2px_2px_0_var(--color-ink)]"
      )}
    >
      {label}
    </button>
  );
}
