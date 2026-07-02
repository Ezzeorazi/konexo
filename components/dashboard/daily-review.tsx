"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoonStar, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dailyReview } from "@/app/(app)/dashboard/actions";

/**
 * Botón "Cierre del día": la IA repasa todo lo que avanzaste hoy en el modo
 * activo (interacciones, avances, altas y movimientos) y te deja los próximos
 * pasos para mañana. Muestra el resultado en un diálogo.
 */
export function DailyReviewButton() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setOpen(true);
    setResult(null);
    startTransition(async () => {
      const res = await dailyReview();
      if (res.ok) {
        setResult(res.text);
      } else {
        toast.error(res.error, { duration: 10000 });
        setOpen(false);
      }
    });
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success("Copiado.");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="btn-comic rough-2 bg-ink px-6 py-2.5 font-display text-xl tracking-wider text-komic disabled:opacity-60"
      >
        {pending ? "PENSANDO..." : "CIERRE DEL DÍA"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoonStar className="size-4 text-primary" />
              Cierre del día
            </DialogTitle>
            <DialogDescription>
              Todo lo que avanzaste hoy en este modo, y qué encarar mañana.
            </DialogDescription>
          </DialogHeader>
          {pending ? (
            <p className="text-sm text-muted-foreground">
              Repasando tu día... Con modelos locales puede tardar un poco.
            </p>
          ) : result ? (
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-sm">{result}</p>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-3.5" />
                Copiar
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
