"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createVenture,
  updateVenture,
  deleteVenture,
} from "@/app/(app)/oportunidades/venture-actions";
import { OWN_ACCENTS, OWN_EMOJIS, getOwnAccent } from "@/lib/appearance";
import { cn } from "@/lib/utils";

export type ManagedVenture = {
  id: string;
  name: string;
  color: string | null;
  emoji: string | null;
};

export function VenturesManager({
  ventures,
  trigger,
}: {
  ventures: ManagedVenture[];
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else if (res.error) toast.error(res.error);
    });
  }

  function create() {
    if (!newName.trim()) return;
    run(async () => {
      const res = await createVenture({ name: newName });
      if (res.ok) setNewName("");
      return res;
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            Emprendimientos
          </DialogTitle>
          <DialogDescription>
            Tus negocios para segmentar el pipeline. Ponele nombre, color y emoji
            a cada uno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {ventures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no tenés emprendimientos. Creá el primero abajo.
            </p>
          ) : (
            <ul className="space-y-3">
              {ventures.map((v) => (
                <VentureRow
                  key={v.id}
                  venture={v}
                  disabled={pending}
                  onRename={(name) => run(() => updateVenture(v.id, { name }))}
                  onColor={(color) => run(() => updateVenture(v.id, { color }))}
                  onEmoji={(emoji) => run(() => updateVenture(v.id, { emoji }))}
                  onDelete={() => {
                    if (confirm(`¿Eliminar "${v.name}"?`))
                      run(() => deleteVenture(v.id));
                  }}
                />
              ))}
            </ul>
          )}

          <div className="flex gap-2 border-t pt-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nuevo emprendimiento…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
            />
            <Button
              type="button"
              onClick={create}
              disabled={pending || !newName.trim()}
            >
              <Plus className="size-4" />
              Crear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VentureRow({
  venture,
  disabled,
  onRename,
  onColor,
  onEmoji,
  onDelete,
}: {
  venture: ManagedVenture;
  disabled: boolean;
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onEmoji: (emoji: string) => void;
  onDelete: () => void;
}) {
  return (
    <li className="space-y-2 rounded-md border-2 border-muted p-3">
      <div className="flex items-center gap-2">
        <Input
          defaultValue={venture.name}
          className="h-8 flex-1"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== venture.name) onRename(v);
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          aria-label="Eliminar emprendimiento"
          className="text-muted-foreground transition-colors hover:text-alarm disabled:opacity-30"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {OWN_ACCENTS.map((a) => {
          const active = a.key === venture.color;
          return (
            <button
              key={a.key}
              type="button"
              disabled={disabled}
              title={a.label}
              aria-label={`Color ${a.label}`}
              onClick={() => onColor(active ? "" : a.key)}
              className={cn(
                "size-6 rounded-full border-2 border-ink transition-transform hover:scale-110 disabled:opacity-50",
                a.swatch,
                active && "ring-2 ring-ink ring-offset-2 ring-offset-background"
              )}
            />
          );
        })}
        <span className="mx-1 h-5 w-px bg-border" />
        {OWN_EMOJIS.slice(0, 8).map((e) => {
          const active = e === venture.emoji;
          return (
            <button
              key={e}
              type="button"
              disabled={disabled}
              aria-label={`Emoji ${e}`}
              onClick={() => onEmoji(active ? "" : e)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border-2 text-base transition-colors hover:bg-muted disabled:opacity-50",
                active ? "border-ink bg-komic" : "border-transparent"
              )}
            >
              {e}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Vista previa:</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded border-2 border-ink px-1.5 py-0.5 font-display text-[10px] leading-none tracking-wide",
            getOwnAccent(venture.color).badge
          )}
        >
          {venture.emoji ? <span>{venture.emoji}</span> : null}
          {venture.name}
        </span>
      </div>
    </li>
  );
}
