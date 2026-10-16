"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Mic, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateInterviewPrep } from "@/app/(app)/oportunidades/interview-actions";
import { INTERVIEW_STAGES, type InterviewStage } from "@/lib/interview";
import { startMockInterview } from "@/lib/mock-interview-event";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function InterviewPrepCard({
  opportunityId,
  title,
  hasJobDescription,
  highlight,
  initialPrep,
}: {
  opportunityId: string;
  title: string;
  hasJobDescription: boolean;
  /** La búsqueda está en etapa Entrevista: la card se destaca. */
  highlight: boolean;
  initialPrep: { text: string; stage: InterviewStage; at: string } | null;
}) {
  const [stage, setStage] = useState<InterviewStage>(initialPrep?.stage ?? "screening");
  const [prep, setPrep] = useState(initialPrep);
  const [pending, startTransition] = useTransition();
  const stageLabel = INTERVIEW_STAGES.find((s) => s.key === stage)!.label;

  function generate() {
    startTransition(async () => {
      const res = await generateInterviewPrep(opportunityId, stage);
      if (res.ok) {
        setPrep({ text: res.text, stage: res.stage, at: res.at });
        toast.success("Pack de preparación listo.");
      } else {
        toast.error(res.error, { duration: 10000 });
      }
    });
  }

  return (
    <Card
      id="entrevista"
      className={cn("scroll-mt-6", highlight && "border-[3px] border-alarm")}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="size-4 text-primary" />
          Preparar la entrevista
        </CardTitle>
        <CardDescription>
          Preguntas probables, tus historias STAR, preguntas difíciles y qué
          preguntar vos. Después, practicá con un simulacro en el chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasJobDescription ? (
          <p className="text-sm text-muted-foreground">
            Pegá la descripción del aviso para preparar la entrevista.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo de entrevista">
              {INTERVIEW_STAGES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={stage === s.key}
                  onClick={() => setStage(s.key)}
                  className={cn(
                    "rounded-md border-2 border-ink px-2.5 py-1 font-display text-xs tracking-wide",
                    stage === s.key ? "bg-ink text-paper" : "bg-paper text-ink"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={generate} disabled={pending}>
                <NotebookPen className="size-4" />
                {pending
                  ? "Armando el pack..."
                  : prep?.stage === stage
                    ? "Rehacer el pack"
                    : "Armar pack de preparación"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  startMockInterview({ opportunityId, title, stage, stageLabel })
                }
              >
                <Mic className="size-4" />
                Simulacro ({stageLabel})
              </Button>
            </div>
          </>
        )}

        {prep && !pending ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pack para{" "}
              {INTERVIEW_STAGES.find((s) => s.key === prep.stage)?.label ?? prep.stage}{" "}
              · {formatDate(new Date(prep.at))}
            </p>
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm">{prep.text}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(prep.text);
                toast.success("Pack copiado.");
              }}
            >
              <Copy className="size-3.5" />
              Copiar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
