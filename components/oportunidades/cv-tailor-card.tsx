"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Copy, Save, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  saveTailoredCv,
  tailorCv,
  type TailorResult,
} from "@/app/(app)/oportunidades/cv-tailor-actions";
import { cn } from "@/lib/utils";

type Done = Extract<TailorResult, { ok: true }>;
type Tab = "coverage" | "cv" | "letter";

const TABS: { key: Tab; label: string }[] = [
  { key: "coverage", label: "Cobertura" },
  { key: "cv", label: "CV adaptado" },
  { key: "letter", label: "Carta" },
];

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
  const [saving, startSave] = useTransition();
  const [result, setResult] = useState<Done | null>(null);
  const [tab, setTab] = useState<Tab>("cv");
  const [showReview, setShowReview] = useState(false);

  const missing = !hasJobDescription
    ? "Pegá la descripción del aviso para poder adaptar tu CV."
    : !hasCvContent
      ? cvLabel
        ? `La versión de CV “${cvLabel}” no tiene texto. Editala en Configuración y subí el PDF.`
        : "Asigná una versión de CV (con su texto o PDF cargado) desde “Datos”."
      : null;

  function handleGenerate() {
    startTransition(async () => {
      const res = await tailorCv(opportunityId);
      if (res.ok) {
        setResult(res);
        setTab(res.sections ? "cv" : "coverage");
      } else {
        toast.error(res.error, { duration: 10000 });
      }
    });
  }

  const current = result?.sections
    ? { coverage: result.sections.coverage, cv: result.sections.cv, letter: result.sections.letter }[tab]
    : result?.text ?? "";

  function handleSave() {
    if (!result?.sections?.cv) return;
    const cv = result.sections.cv;
    startSave(async () => {
      const res = await saveTailoredCv(opportunityId, cv);
      if (res.ok) toast.success(`Guardado como “${res.label}” y asignado a esta búsqueda.`);
      else toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Adaptar CV con IA
        </CardTitle>
        <CardDescription>
          Un redactor adapta tu CV y escribe la carta; un revisor (que actúa de
          hiring manager) marca lo inventado, los requisitos sin cubrir y los
          clichés; el redactor corrige.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {missing ? (
          <p className="text-sm text-muted-foreground">{missing}</p>
        ) : (
          <Button size="sm" onClick={handleGenerate} disabled={pending}>
            <Sparkles className="size-4" />
            {pending
              ? "Redactando, revisando y corrigiendo..."
              : result
                ? "Volver a generar"
                : "Adaptar CV y carta"}
          </Button>
        )}
        {pending ? (
          <p className="text-xs text-muted-foreground">
            Son tres pasadas de IA: puede tardar hasta un minuto. No cierres la
            página.
          </p>
        ) : null}

        {result && !pending ? (
          <div className="space-y-2">
            {result.sections ? (
              <div className="flex flex-wrap gap-1" role="tablist">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "rounded-md border-2 border-ink px-2.5 py-1 font-display text-xs tracking-wide",
                      tab === t.key ? "bg-ink text-paper" : "bg-paper text-ink"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm">
                {current || "(vacío)"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(current);
                  toast.success("Copiado.");
                }}
              >
                <Copy className="size-3.5" />
                Copiar
              </Button>
              {result.sections?.cv && tab === "cv" ? (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="size-3.5" />
                  {saving ? "Guardando..." : "Guardar como versión nueva"}
                </Button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setShowReview((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={showReview}
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", showReview && "rotate-180")}
              />
              Qué marcó el revisor
            </button>
            {showReview ? (
              <div className="max-h-64 overflow-y-auto rounded-md border border-dashed p-3">
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {result.review}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
