"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tailorCv } from "@/app/(app)/oportunidades/actions";

export function CvTailorCard({
  opportunityId,
  hasJobDescription,
  hasCvContent,
  cvLabel,
}: {
  opportunityId: string;
  hasJobDescription: boolean;
  hasCvContent: boolean;
  cvLabel: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const missing = !hasJobDescription
    ? "Agregá la descripción del puesto desde “Editar” para poder adaptar tu CV."
    : !hasCvContent
      ? cvLabel
        ? `La versión de CV “${cvLabel}” no tiene contenido cargado. Editala en Configuración pegando el texto de tu CV.`
        : "Asigná una versión de CV (con su texto cargado) desde “Editar”."
      : null;

  function handleGenerate() {
    startTransition(async () => {
      const res = await tailorCv(opportunityId);
      if (res.ok) {
        setResult(res.text);
      } else {
        toast.error(res.error, { duration: 10000 });
      }
    });
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success("Sugerencias copiadas.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Adaptar CV con IA
        </CardTitle>
        <CardDescription>
          Compara tu CV con el aviso y sugiere qué cambiar. Configurá el
          proveedor de IA en Configuración.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {missing ? (
          <p className="text-sm text-muted-foreground">{missing}</p>
        ) : (
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={pending}
          >
            <Sparkles className="size-4" />
            {pending
              ? "Generando..."
              : result
                ? "Volver a generar"
                : "Generar sugerencias"}
          </Button>
        )}
        {pending ? (
          <p className="text-xs text-muted-foreground">
            Esto puede tardar un rato largo con modelos locales. No cierres la
            página.
          </p>
        ) : null}
        {result && !pending ? (
          <div className="space-y-2">
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm">{result}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="size-3.5" />
              Copiar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
