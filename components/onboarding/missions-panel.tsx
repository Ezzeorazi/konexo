"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  Trophy,
  Coins,
  Check,
  Building2,
  UserPlus,
  Zap,
  Radar,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboarding } from "@/lib/hooks/use-onboarding";
import { cn } from "@/lib/utils";
// Solo el TIPO (se borra en compilación): así este componente cliente NO arrastra
// lib/onboarding —que importa Prisma y posthog-node— al bundle del navegador.
import type { MissionSlug, OnboardingState } from "@/lib/onboarding";

// Metadata visual por misión (ícono + a dónde guiar al usuario). Vive acá, del
// lado del cliente; el título/descripción/créditos vienen del server en el state.
const MISSION_META: Record<MissionSlug, { icon: LucideIcon; href: string }> = {
  firstSighting: { icon: Building2, href: "/empresas" },
  establishContact: { icon: UserPlus, href: "/contactos" },
  launchAttack: { icon: Zap, href: "/contactos" },
  setRadar: { icon: Radar, href: "/oportunidades" },
};

export function MissionsPanel({
  initialState,
}: {
  initialState: OnboardingState;
}) {
  const { complete, state, pending } = useOnboarding(initialState);
  const view = state ?? initialState;

  const won = view.missions.filter((m) => m.completed).length;
  const total = view.missions.length;
  const pct = total > 0 ? Math.round((won / total) * 100) : 0;

  async function onComplete(slug: MissionSlug) {
    const res = await complete(slug);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (!res.awarded) return; // ya estaba ganada: sin celebración doble
    const m = res.state.missions.find((x) => x.slug === slug);
    toast.success("¡BATALLA GANADA!", {
      description: m ? `${m.title} · +${m.credits} créditos 🪙` : undefined,
      duration: 5000,
    });
    // Bonus: completó la saga entera.
    if (res.state.missions.every((x) => x.completed)) {
      toast("🏆 ¡SAGA COMPLETA!", {
        description: "Ganaste las cuatro batallas. Sos imparable.",
        duration: 7000,
      });
    }
  }

  return (
    <Card className="bg-panelw">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-alarm" />
          SALÓN DE BATALLAS
          {/* Contador de créditos como chapa cómic */}
          <span className="ml-auto flex items-center gap-1.5 rounded-md border-2 border-ink bg-ink px-2.5 py-1 font-display text-base tracking-wide text-komic">
            <Coins className="size-4" />
            {view.credits}
          </span>
        </CardTitle>
        <CardDescription className="font-hand text-base">
          Completá tus primeras misiones, ganá créditos y dominá Konexo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ===== Contador + barra de progreso ===== */}
        <div>
          <div className="mb-1.5 flex items-end justify-between">
            <span className="font-display text-2xl leading-none tracking-wide text-ink">
              {won}
              <span className="text-ink/40">/{total}</span>{" "}
              <span className="text-lg">BATALLAS GANADAS</span>
            </span>
            <span className="font-display text-lg text-hero">{pct}%</span>
          </div>
          <div
            className="h-5 w-full overflow-hidden rounded-full border-[3px] border-ink bg-paper"
            role="progressbar"
            aria-valuenow={won}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`${won} de ${total} misiones completadas`}
          >
            <div
              className="h-full bg-hero halftone-yellow transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* ===== Lista de misiones ===== */}
        <ul className="space-y-2">
          {view.missions.map((m) => {
            const Icon = MISSION_META[m.slug].icon;
            return (
              <li
                key={m.slug}
                className={cn(
                  "flex items-center gap-3 rounded-md border-2 border-ink px-3 py-2.5 transition-colors",
                  m.completed ? "bg-hero/10" : "bg-paper"
                )}
              >
                {/* Indicador cuadrado: check si ganada, ícono si pendiente */}
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink",
                    m.completed ? "bg-hero text-paper" : "bg-komic text-ink"
                  )}
                >
                  {m.completed ? (
                    <Check className="size-5" strokeWidth={3.5} />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-display tracking-wide text-ink",
                      m.completed && "line-through decoration-2 opacity-60"
                    )}
                  >
                    {m.title}
                  </p>
                  <p className="truncate font-hand text-sm text-muted-foreground">
                    {m.description}
                  </p>
                </div>

                {/* Estado: badge "GANADA" o botón/guía sutil */}
                {m.completed ? (
                  <span className="shrink-0 rotate-2 rounded-md border-2 border-ink bg-hero px-2 py-0.5 font-display text-xs tracking-wide text-paper">
                    GANADA ✦
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden font-display text-sm text-alarm sm:inline">
                      +{m.credits}
                    </span>
                    <Link
                      href={MISSION_META[m.slug].href}
                      className="rounded-md border-2 border-ink bg-paper px-2 py-1 text-ink/60 transition-colors hover:bg-komic hover:text-ink"
                      title="Ir a completarla"
                      aria-label={`Ir a completar: ${m.title}`}
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                    {/* Botón sutil: marca la batalla (catch-up) vía useOnboarding */}
                    <button
                      type="button"
                      onClick={() => onComplete(m.slug)}
                      disabled={pending}
                      className="btn-comic rounded-md bg-komic px-2.5 py-1 font-display text-sm tracking-wide text-ink disabled:opacity-50"
                    >
                      LISTO
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
