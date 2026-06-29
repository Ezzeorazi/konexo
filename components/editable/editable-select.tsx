"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SaveHandler } from "./types";

export type EditableSelectOption = { value: string; label: string };

type EditableSelectProps = {
  value: string;
  options: EditableSelectOption[];
  onSave: SaveHandler;
  /** Render del valor actual en el trigger (p.ej. un Badge). Por defecto, la label. */
  renderValue?: (value: string) => React.ReactNode;
  placeholder?: string;
  triggerClassName?: string;
  ariaLabel?: string;
};

export function EditableSelect({
  value,
  options,
  onSave,
  renderValue,
  placeholder = "Elegir…",
  triggerClassName,
  ariaLabel,
}: EditableSelectProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [optimistic, setOptimistic] = useState<string | null>(null);

  // Descarta el valor optimista cuando llegan datos frescos del server.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setOptimistic(null);
  }

  const current = optimistic ?? value;
  const currentLabel = options.find((o) => o.value === current)?.label;

  function handleChange(next: string) {
    if (next === current) return;
    setOptimistic(next);
    setSaving(true);
    onSave(next)
      .then((result) => {
        if (result.ok) {
          router.refresh();
        } else {
          setOptimistic(null);
          toast.error(result.error);
        }
      })
      .catch(() => {
        setOptimistic(null);
        toast.error("No se pudo guardar el cambio.");
      })
      .finally(() => setSaving(false));
  }

  return (
    <Select
      value={current}
      onValueChange={(v) => handleChange(String(v ?? ""))}
      items={options}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        data-saving={saving || undefined}
        className={cn(
          "h-auto border-transparent bg-transparent px-1.5 py-0.5 hover:bg-muted/60 data-[saving]:opacity-60",
          triggerClassName
        )}
      >
        {renderValue ? (
          renderValue(current)
        ) : (
          <span className={cn(!currentLabel && "text-muted-foreground")}>
            {currentLabel ?? placeholder}
          </span>
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
