"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { catchMeUp } from "@/app/(app)/oportunidades/actions";

/**
 * Botón "Ponme al día": pide a la IA un resumen del estado del proyecto y una
 * guía para retomarlo (no redacta mensajes). Muestra el resultado en un diálogo.
 */
export function CatchMeUpButton({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setOpen(true);
    setResult(null);
    startTransition(async () => {
      const res = await catchMeUp(opportunityId);
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
      <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        <Sparkles className="size-4" />
        {pending ? "Pensando..." : "Ponme al día"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Al día con este proyecto
            </DialogTitle>
            <DialogDescription>
              Resumen del estado y próximos pasos según tus tareas, bitácora y
              timeline.
            </DialogDescription>
          </DialogHeader>
          {pending ? (
            <p className="text-sm text-muted-foreground">
              Leyendo el proyecto... Con modelos locales puede tardar un poco.
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
