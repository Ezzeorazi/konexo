"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { evaluateFit } from "@/app/(app)/oportunidades/fit-actions";
import {
  FIT_DIMENSIONS,
  FIT_GATES,
  FIT_VERDICT_ADVICE,
  FIT_VERDICT_LABELS,
  type FitReport,
  type FitVerdict,
  type GateVerdict,
} from "@/lib/fit";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const VERDICT_STYLE: Record<FitVerdict, string> = {
  strong: "bg-hero text-paper",
  good: "bg-hero/70 text-ink",
  moderate: "bg-komic text-ink",
  weak: "bg-alarm/70 text-ink",
  poor: "bg-alarm text-paper",
  blocked: "bg-ink text-paper",
};

const GATE_STYLE: Record<GateVerdict, { label: string; cls: string }> = {
  PASS: { label: "PASA", cls: "bg-hero text-paper" },
  FLAG: { label: "OJO", cls: "bg-komic text-ink" },
  FAIL: { label: "NO PASA", cls: "bg-alarm text-paper" },
  UNVERIFIED: { label: "SIN DATO", cls: "bg-paper text-ink" },
};

export function FitCard({
  opportunityId,
  initialReport,
  hasJobDescription,
  profileReady,
}: {
  opportunityId: string;
  initialReport: FitReport | null;
  hasJobDescription: boolean;
  profileReady: boolean;
}) {
  const [report, setReport] = useState(initialReport);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await evaluateFit(opportunityId);
      if (res.ok) {
        setReport(res.report);
        toast.success(FIT_VERDICT_LABELS[res.report.verdict]);
      } else {
        toast.error(res.error, { duration: 10000 });
      }
    });
  }

  const missing = !profileReady ? (
    <>
      Completá tu{" "}
      <Link href="/configuracion#perfil-candidato" className="underline">
        perfil de candidato
      </Link>{" "}
      (al menos skills fuertes y experiencia) para poder evaluar.
    </>
  ) : !hasJobDescription ? (
    "Pegá la descripción del aviso para poder evaluar el fit."
  ) : null;

  return (
    <Card id="fit" className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-primary" />
          Evaluar fit con IA
        </CardTitle>
        <CardDescription>
          Pasa los filtros de permiso, idioma y ubicación, y puntúa el aviso
          contra tu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report ? <FitReportView report={report} /> : null}

        {missing ? (
          <p className="text-sm text-muted-foreground">{missing}</p>
        ) : (
          <Button size="sm" onClick={run} disabled={pending}>
            <Target className="size-4" />
            {pending ? "Evaluando..." : report ? "Volver a evaluar" : "Evaluar fit"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FitReportView({ report }: { report: FitReport }) {
  return (
    <div className="space-y-4">
      {/* Puntaje + veredicto */}
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "burst burst-shadow flex size-20 shrink-0 flex-col items-center justify-center",
            VERDICT_STYLE[report.verdict]
          )}
        >
          <span className="font-display text-3xl leading-none">
            {report.overall ?? "✕"}
          </span>
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl tracking-wide text-ink">
            {FIT_VERDICT_LABELS[report.verdict].toUpperCase()}
          </p>
          <p className="text-sm text-muted-foreground">
            {FIT_VERDICT_ADVICE[report.verdict]}
          </p>
          <p className="text-xs text-muted-foreground">
            Evaluado el {formatDate(new Date(report.evaluatedAt))}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <ul className="space-y-1.5 text-sm">
        {FIT_GATES.map((g) => {
          const gate = report.gates[g.key];
          const style = GATE_STYLE[gate.verdict];
          return (
            <li key={g.key} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 w-20 shrink-0 rounded border-2 border-ink px-1 text-center font-display text-[11px] tracking-wide",
                  style.cls
                )}
              >
                {style.label}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{g.label}</span>
                {gate.note ? ` — ${gate.note}` : ""}
                {gate.quote ? (
                  <span className="block text-xs text-muted-foreground italic">
                    “{gate.quote}”
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Dimensiones */}
      <ul className="space-y-2 text-sm">
        {FIT_DIMENSIONS.map((d) => {
          const s = report.scores[d.key];
          return (
            <li key={d.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {d.label}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(d.weight * 100)}%)
                  </span>
                </span>
                <span className="font-display">{s.score ?? "—"}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-ink bg-paper">
                <div
                  className="h-full bg-hero"
                  style={{ width: `${s.score ?? 0}%` }}
                />
              </div>
              {s.note ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{s.note}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {report.strengths.length ? (
        <div className="text-sm">
          <p className="font-medium">Fortalezas para este aviso</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {report.strengths.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.gaps.length ? (
        <div className="text-sm">
          <p className="font-medium">Brechas a cubrir</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {report.gaps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.recommendation ? (
        <p className="rounded-md border-2 border-ink bg-panelw px-3 py-2 text-sm">
          {report.recommendation}
        </p>
      ) : null}
    </div>
  );
}
