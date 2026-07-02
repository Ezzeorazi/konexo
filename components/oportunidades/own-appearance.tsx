"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { patchOpportunityField } from "@/app/(app)/oportunidades/actions";
import {
  OWN_ACCENTS,
  OWN_EMOJIS,
  getOwnAccent,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

// Personalización de un proyecto propio: color de acento + emoji. Guarda cada
// cambio al toque (patchOpportunityField), sin apariencia de formulario.
export function OwnProjectAppearance({
  opportunityId,
  accentColor,
  accentEmoji,
}: {
  opportunityId: string;
  accentColor: string | null;
  accentEmoji: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = getOwnAccent(accentColor);

  function save(field: "accentColor" | "accentEmoji", value: string) {
    startTransition(async () => {
      const res = await patchOpportunityField(opportunityId, field, value);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {OWN_ACCENTS.map((a) => {
          const active = a.key === current.key;
          return (
            <button
              key={a.key}
              type="button"
              disabled={pending}
              title={a.label}
              aria-label={`Acento ${a.label}`}
              onClick={() => save("accentColor", a.key)}
              className={cn(
                "flex size-7 items-center justify-center rounded-full border-2 border-ink transition-transform hover:scale-110 disabled:opacity-50",
                a.swatch,
                active && "ring-2 ring-ink ring-offset-2 ring-offset-background"
              )}
            >
              {active ? (
                <Check className="size-4 text-white drop-shadow-[0_1px_1px_var(--color-ink)]" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {OWN_EMOJIS.map((e) => {
          const active = e === accentEmoji;
          return (
            <button
              key={e}
              type="button"
              disabled={pending}
              onClick={() => save("accentEmoji", active ? "" : e)}
              aria-label={`Emoji ${e}`}
              className={cn(
                "flex size-8 items-center justify-center rounded-md border-2 text-lg transition-colors hover:bg-muted disabled:opacity-50",
                active ? "border-ink bg-komic" : "border-transparent"
              )}
            >
              {e}
            </button>
          );
        })}
      </div>
    </div>
  );
}
