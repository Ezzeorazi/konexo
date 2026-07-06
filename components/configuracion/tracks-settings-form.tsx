"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveEnabledTracks } from "@/app/(app)/configuracion/actions";
import {
  AVAILABLE_TRACKS,
  getVocab,
  withBusinessName,
  type Track,
} from "@/lib/tracks";
import { cn } from "@/lib/utils";

// Etiqueta en primera persona para la elección inicial ("¿Qué estás haciendo
// ahora?"). El nombre del modo (Búsqueda laboral / Tu negocio) queda como
// subtítulo. Fallback al nombre del modo para cualquier track sin frase propia.
const ACTION_LABELS: Partial<Record<Track, string>> = {
  jobs: "Buscando trabajo",
  freelance: "Haciendo crecer lo mío",
};

export function TracksSettingsForm({
  initialEnabled,
  initialBusinessName = "",
}: {
  initialEnabled: Track[];
  initialBusinessName?: string;
}) {
  const [enabled, setEnabled] = useState<Track[]>(initialEnabled);
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [pending, startTransition] = useTransition();

  function toggle(track: Track) {
    setEnabled((prev) =>
      prev.includes(track)
        ? prev.filter((t) => t !== track)
        : [...prev, track]
    );
  }

  function handleSave() {
    if (enabled.length === 0) {
      toast.error("Dejá al menos un modo activo.");
      return;
    }
    startTransition(async () => {
      const res = await saveEnabledTracks(enabled, businessName);
      if (res.ok) toast.success("Modos actualizados.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AVAILABLE_TRACKS.map((track) => {
          const vocab = getVocab(track);
          const on = enabled.includes(track);
          return (
            <button
              key={track}
              type="button"
              onClick={() => toggle(track)}
              aria-pressed={on}
              className={cn(
                "relative flex flex-col gap-1.5 rounded-lg border-[2.5px] p-4 text-left transition-all",
                on
                  ? "-rotate-1 border-ink bg-komic text-ink shadow-[3px_3px_0_var(--color-ink)]"
                  : "border-muted bg-background text-muted-foreground hover:border-ink/40"
              )}
            >
              {on ? (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border-2 border-ink bg-paper text-ink">
                  <Check className="size-3" />
                </span>
              ) : null}
              <span className="text-2xl">{vocab.emoji}</span>
              <span className="flex items-center gap-2 font-display text-lg tracking-wide">
                {ACTION_LABELS[track] ?? vocab.name}
                {vocab.status === "soon" ? (
                  <span className="rounded border border-current px-1 text-[10px] font-normal uppercase tracking-wider opacity-70">
                    beta
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide opacity-60">
                Modo {withBusinessName(vocab, businessName).name}
              </span>
              <span className="font-hand text-sm leading-snug">
                {vocab.tagline}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Activá los dos para manejar tu búsqueda laboral y tu negocio en la misma
        cuenta: vas a ver un selector arriba para cambiar de pipeline.
      </p>

      {enabled.includes("freelance") ? (
        <div className="space-y-1.5 rounded-lg border-2 border-dashed border-muted p-3">
          <Label htmlFor="businessName">Nombre de tu negocio</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Tu negocio"
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            Cómo se llama tu modo de negocio en el menú (ej. el nombre de tu
            emprendimiento). Dejalo vacío para usar “Tu negocio”.
          </p>
        </div>
      ) : null}

      <Button onClick={handleSave} disabled={pending}>
        {pending ? "Guardando..." : "Guardar modos"}
      </Button>
    </div>
  );
}
