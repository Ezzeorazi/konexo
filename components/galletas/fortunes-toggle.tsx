"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setFortunesEnabled } from "@/app/(app)/galletas/actions";

export function FortunesToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    startTransition(async () => {
      await setFortunesEnabled(next);
      setEnabled(next);
      toast.success(next ? "¡Galletas de vuelta! 🥠" : "Galletas escondidas.");
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {enabled
          ? "Encendidas: ves la galleta del día en el dashboard y una en cada búsqueda."
          : "Apagadas en este dispositivo."}
      </p>
      <Button
        variant={enabled ? "outline" : "default"}
        size="sm"
        onClick={toggle}
        disabled={pending}
      >
        {enabled ? "Esconder galletas" : "Prender galletas"}
      </Button>
    </div>
  );
}
