"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { analyzeCv } from "@/app/(app)/configuracion/cv-actions";
import { AtsIssues } from "@/components/configuracion/ats-issues";
import type { AtsCheck } from "@/lib/cv-ats";

/** "Analizar CV": legibilidad ATS (instantánea) + crítica con IA. */
export function CvAnalyzeDialog({
  cvVersionId,
  label,
  hasContent,
}: {
  cvVersionId: string;
  label: string;
  hasContent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ text: string; ats: AtsCheck } | null>(null);

  function run() {
    startTransition(async () => {
      const res = await analyzeCv(cvVersionId);
      if (res.ok) setResult({ text: res.text, ats: res.ats });
      else toast.error(res.error, { duration: 10000 });
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Al abrir por primera vez arranca solo: es para lo que se abrió.
    if (next && !result && !pending && hasContent) run();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" disabled={!hasContent}>
            <ScanSearch className="size-3.5" />
            <span className="sr-only">Analizar CV</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Análisis de “{label}”</DialogTitle>
          <DialogDescription>
            Legibilidad para ATS y una crítica honesta de cómo está escrito.
          </DialogDescription>
        </DialogHeader>
        {pending ? (
          <p className="text-sm text-muted-foreground">Analizando tu CV…</p>
        ) : result ? (
          <div className="space-y-3">
            <AtsIssues ats={result.ats} />
            <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm">{result.text}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.text);
                  toast.success("Análisis copiado.");
                }}
              >
                <Copy className="size-3.5" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={run}>
                Volver a analizar
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" onClick={run}>
            <ScanSearch className="size-4" />
            Analizar
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
