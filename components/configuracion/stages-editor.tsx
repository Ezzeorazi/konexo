"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Trash2, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createStage,
  updateStage,
  deleteStage,
  moveStage,
  resetStages,
} from "@/app/(app)/configuracion/stage-actions";
import { getVocab, type Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";

export type EditableStage = {
  id: string;
  key: string;
  label: string;
  order: number;
  type: string;
  probability: number;
};

const TYPE_OPTIONS = [
  { value: "open", label: "Abierta" },
  { value: "won", label: "Ganada" },
  { value: "lost", label: "Perdida" },
];

export function StagesEditor({
  track,
  stages,
}: {
  track: Track;
  stages: EditableStage[];
}) {
  const router = useRouter();
  const vocab = getVocab(track);
  const [pending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok && res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function saveRow(stage: EditableStage, patch: Partial<EditableStage>) {
    const merged = { ...stage, ...patch };
    if (
      merged.label === stage.label &&
      merged.type === stage.type &&
      merged.probability === stage.probability &&
      Object.keys(patch).length > 0
    ) {
      return; // sin cambios reales
    }
    run(() =>
      updateStage(stage.id, {
        label: merged.label,
        type: merged.type,
        probability: merged.probability,
      })
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-base tracking-wide">
          <span className="text-lg">{vocab.emoji}</span>
          {vocab.name}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Restaurar las etapas por defecto de ${vocab.name}?`))
              run(() => resetStages(track));
          }}
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      <ul className="space-y-2">
        {stages.map((stage, i) => (
          <li
            key={stage.id}
            className="flex flex-wrap items-center gap-2 rounded-md border-2 border-muted bg-background p-2"
          >
            <div className="flex flex-col">
              <button
                type="button"
                disabled={pending || i === 0}
                onClick={() => run(() => moveStage(stage.id, "up"))}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Subir"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                disabled={pending || i === stages.length - 1}
                onClick={() => run(() => moveStage(stage.id, "down"))}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Bajar"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>

            <Input
              defaultValue={stage.label}
              className="h-8 min-w-32 flex-1"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== stage.label) saveRow(stage, { label: v });
              }}
            />

            <select
              defaultValue={stage.type}
              disabled={pending}
              onChange={(e) => saveRow(stage, { type: e.target.value })}
              className={cn(
                "h-8 rounded-md border-2 border-input bg-background px-2 text-sm"
              )}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {vocab.hasValue ? (
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={stage.probability}
                  className="h-8 w-16"
                  onBlur={(e) => {
                    const v = Math.round(Number(e.target.value));
                    if (!Number.isNaN(v) && v !== stage.probability)
                      saveRow(stage, { probability: v });
                  }}
                />
                %
              </label>
            ) : null}

            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteStage(stage.id))}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30"
              aria-label="Borrar etapa"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nueva etapa…"
          className="h-9"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim()) {
              e.preventDefault();
              run(() =>
                createStage(track, {
                  label: newLabel,
                  type: "open",
                  probability: 0,
                })
              );
              setNewLabel("");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending || !newLabel.trim()}
          onClick={() => {
            run(() =>
              createStage(track, {
                label: newLabel,
                type: "open",
                probability: 0,
              })
            );
            setNewLabel("");
          }}
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
      {vocab.hasValue ? (
        <p className="text-xs text-muted-foreground">
          El % es la probabilidad de cierre de cada etapa: alimenta el forecast
          ponderado del dashboard.
        </p>
      ) : null}
    </div>
  );
}
