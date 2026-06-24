"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Building2, CalendarClock } from "lucide-react";
import { updateOpportunityStage } from "@/app/(app)/oportunidades/actions";
import { PriorityBadge } from "@/components/badges";
import { labelFor, type StageDef } from "@/lib/tracks";
import { formatDate, formatOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type KanbanOpportunity = {
  id: string;
  title: string;
  stage: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  nextFollowUpAt: Date | null;
  company: { id: string; name: string } | null;
};

function OpportunityCard({
  opportunity,
  dragging = false,
}: {
  opportunity: KanbanOpportunity;
  dragging?: boolean;
}) {
  const overdue =
    opportunity.nextFollowUpAt && opportunity.nextFollowUpAt < new Date();

  return (
    <div
      className={cn(
        "space-y-2 rounded-md border-[2.5px] border-ink bg-background p-3 shadow-[3px_3px_0_var(--color-ink)] transition-shadow",
        dragging && "rotate-2 shadow-[5px_5px_0_var(--color-ink)]"
      )}
    >
      <Link
        href={`/oportunidades/${opportunity.id}`}
        className="block text-sm font-medium leading-snug hover:underline"
      >
        {opportunity.title}
      </Link>
      {opportunity.company ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3" />
          {opportunity.company.name}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={opportunity.priority} />
        {opportunity.nextFollowUpAt ? (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              overdue ? "font-medium text-alarm" : "text-muted-foreground"
            )}
          >
            <CalendarClock className="size-3" />
            {overdue
              ? formatOverdue(opportunity.nextFollowUpAt)
              : formatDate(opportunity.nextFollowUpAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DraggableCard({ opportunity }: { opportunity: KanbanOpportunity }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opportunity.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none", isDragging && "opacity-30")}
    >
      <OpportunityCard opportunity={opportunity} />
    </div>
  );
}

function Column({
  stage,
  label,
  opportunities,
}: {
  stage: string;
  label: string;
  opportunities: KanbanOpportunity[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "halftone flex min-h-48 w-60 shrink-0 flex-col gap-2 rounded-lg border-[3px] border-ink bg-panelw/60 p-3 transition-colors md:w-auto md:flex-1",
        isOver && "bg-komic/40"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-base tracking-wide text-ink">
          {label.toUpperCase()}
        </h2>
        <span className="rounded-md border-2 border-ink bg-komic px-2 py-0.5 font-display text-xs leading-none text-ink">
          {opportunities.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {opportunities.map((opp) => (
          <DraggableCard key={opp.id} opportunity={opp} />
        ))}
        {opportunities.length === 0 ? (
          <p className="px-1 py-4 text-center font-hand text-sm text-muted-foreground">
            Sin oportunidades
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Kanban({
  opportunities,
  stages,
}: {
  opportunities: KanbanOpportunity[];
  stages: StageDef[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(opportunities);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Re-sincroniza el estado local cuando llegan datos frescos del server
  // (patrón "adjusting state during render", evita un useEffect en cascada)
  const [prevOpportunities, setPrevOpportunities] = useState(opportunities);
  if (prevOpportunities !== opportunities) {
    setPrevOpportunities(opportunities);
    setItems(opportunities);
  }

  // Distancia mínima para iniciar drag: deja pasar los clicks al link de la card
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const newStage = String(over.id);
    const item = items.find((o) => o.id === id);
    if (!item || item.stage === newStage) return;

    const previous = items;
    setItems((prev) =>
      prev.map((o) => (o.id === id ? { ...o, stage: newStage } : o))
    );
    updateOpportunityStage(id, newStage)
      .then(() => {
        toast.success(`Movida a ${labelFor(stages, newStage)}.`);
        router.refresh();
      })
      .catch(() => {
        setItems(previous);
        toast.error("No se pudo mover la oportunidad.");
      });
  }

  const activeItem = activeId
    ? items.find((o) => o.id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column
            key={stage.key}
            stage={stage.key}
            label={stage.label}
            opportunities={items.filter((o) => o.stage === stage.key)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <OpportunityCard opportunity={activeItem} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
