"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bot,
  Copy,
  Flame,
  Play,
  Mail,
  AtSign,
  MessageSquare,
  ListChecks,
  PenLine,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { runAgents } from "@/app/(app)/asistente/agent-actions";
import type {
  AgentStep,
  AgentTeamResult,
  Draft,
  Qualification,
  Tier,
} from "@/lib/agent-team";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<Tier, { badge: string; label: string }> = {
  hot: { badge: "bg-alarm text-paper", label: "CALIENTE" },
  warm: { badge: "bg-komic text-ink", label: "TIBIA" },
  cold: { badge: "bg-muted text-muted-foreground", label: "FRÍA" },
};

const AGENT_META = {
  orquestador: { icon: Network, name: "Orquestador" },
  calificador: { icon: ListChecks, name: "Calificador" },
  redactor: { icon: PenLine, name: "Redactor" },
} as const;

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  linkedin: AtSign,
  whatsapp: MessageSquare,
  mensaje: MessageSquare,
};

export function AgentTeam() {
  const [result, setResult] = useState<AgentTeamResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const res = await runAgents();
        setResult(res);
        if (!res.ok) toast.error(res.error, { duration: 9000 });
      } catch {
        toast.error("No pude poner a trabajar al equipo. Reintentá.");
      }
    });
  }

  const qualifications = result?.ok ? result.qualifications : [];
  const drafts = result?.ok ? result.drafts : [];
  const steps = result?.steps ?? [];

  return (
    <div className="space-y-6">
      {/* ===== Lanzador + traza del equipo ===== */}
      <Card className="bg-ink text-paper">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-komic">
            <Bot className="size-5" />
            EQUIPO DE AGENTES
          </CardTitle>
          <CardDescription className="font-hand text-base text-paper/70">
            No es un chat: es un equipo. El Calificador prioriza tu embudo y el
            Redactor escribe los borradores en paralelo, sobre tus datos reales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={run}
            disabled={pending}
            size="lg"
            className="bg-alarm text-paper hover:bg-alarm"
          >
            <Play className="size-4" />
            {pending ? "El equipo está trabajando…" : "Poner el equipo a trabajar"}
          </Button>

          {steps.length > 0 ? (
            <ol className="space-y-2 border-t-2 border-dashed border-paper/30 pt-4">
              {steps.map((s, i) => (
                <StepRow key={i} step={s} />
              ))}
              {pending ? (
                <li className="font-hand text-sm text-paper/60">
                  …trabajando
                </li>
              ) : null}
            </ol>
          ) : pending ? (
            <p className="font-hand text-sm text-paper/60">
              Despertando a los agentes…
            </p>
          ) : null}

          {result?.ok ? (
            <p className="font-hand text-xs text-paper/50">
              Motor: {result.providerLabel}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* ===== Resultados: dos paneles, dos agentes ===== */}
      {result?.ok ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Panel Calificador */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-5 text-hero" />
                CALIFICADOR
              </CardTitle>
              <CardDescription className="font-hand text-base">
                Tu embudo, ordenado por prioridad y con el próximo paso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {qualifications.map((q, i) => (
                  <QualificationRow key={i} q={q} />
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Panel Redactor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="size-5 text-alarm" />
                REDACTOR
              </CardTitle>
              <CardDescription className="font-hand text-base">
                Borradores listos para copiar y enviar a las más calientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {drafts.length === 0 ? (
                <p className="font-hand text-base text-muted-foreground">
                  No se generaron borradores en esta corrida.
                </p>
              ) : (
                drafts.map((d, i) => <DraftCard key={i} draft={d} />)
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function StepRow({ step }: { step: AgentStep }) {
  const meta = AGENT_META[step.agent];
  const Icon = meta.icon;
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-paper/40 bg-paper/10">
        <Icon className="size-3.5 text-komic" />
      </span>
      <p className="font-hand text-sm leading-snug text-paper/90">
        <span className="font-display text-xs tracking-wide text-komic">
          {meta.name.toUpperCase()}
          {step.parallel ? " ⇉" : ""}
        </span>{" "}
        {step.text}
      </p>
    </li>
  );
}

function QualificationRow({ q }: { q: Qualification }) {
  const style = TIER_STYLE[q.tier];
  return (
    <li className="rounded-md border-2 border-ink bg-paper px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{q.title}</p>
          {q.company ? (
            <p className="truncate font-hand text-sm text-muted-foreground">
              {q.company} · {q.stageLabel}
            </p>
          ) : (
            <p className="font-hand text-sm text-muted-foreground">
              {q.stageLabel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {q.overdue ? (
            <span className="rounded border-2 border-ink bg-alarm px-1.5 py-0.5 font-display text-[10px] tracking-wide text-paper">
              VENCIDO
            </span>
          ) : null}
          <span
            className={cn(
              "flex items-center gap-1 rounded border-2 border-ink px-1.5 py-0.5 font-display text-[10px] tracking-wide",
              style.badge
            )}
          >
            {q.tier === "hot" ? <Flame className="size-3" /> : null}
            {style.label} {q.score}
          </span>
        </div>
      </div>
      {q.reason ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{q.reason}</p>
      ) : null}
      {q.nextAction ? (
        <p className="mt-1 text-xs font-medium text-ink">→ {q.nextAction}</p>
      ) : null}
    </li>
  );
}

function DraftCard({ draft }: { draft: Draft }) {
  const Icon = CHANNEL_ICON[draft.channel] ?? MessageSquare;
  const full = draft.subject
    ? `Asunto: ${draft.subject}\n\n${draft.body}`
    : draft.body;

  async function copy() {
    await navigator.clipboard.writeText(full);
    toast.success("Borrador copiado.");
  }

  return (
    <div className="rounded-md border-2 border-ink bg-card">
      <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-ink/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-hero" />
          <p className="truncate font-medium text-ink">{draft.title}</p>
        </div>
        <Button variant="ghost" size="xs" onClick={copy} className="shrink-0">
          <Copy className="size-3" />
          Copiar
        </Button>
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <span className="inline-block rounded border-2 border-ink bg-komic px-1.5 py-0.5 font-display text-[10px] tracking-wide text-ink uppercase">
          {draft.channel}
        </span>
        {draft.subject ? (
          <p className="text-sm font-medium text-ink">Asunto: {draft.subject}</p>
        ) : null}
        <p className="text-sm whitespace-pre-wrap text-foreground">{draft.body}</p>
      </div>
    </div>
  );
}
