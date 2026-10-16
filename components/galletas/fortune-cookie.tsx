"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, EyeOff, Trophy } from "lucide-react";
import {
  claimVictoryAction,
  setFortunesEnabled,
} from "@/app/(app)/galletas/actions";
import { cn } from "@/lib/utils";
// Solo el TIPO: este componente cliente no arrastra la lógica al bundle.
import type { Fortune } from "@/lib/fortunes";

/** Cookie de navegador que recuerda que la galleta del día ya se rompió. */
const DAILY_OPEN_COOKIE = "konexo-galleta-dia";

type Props = {
  fortune: Fortune | null;
  /** Galleta del día (dashboard): lleva bonus, una por día. */
  daily?: {
    dayKey: string;
    wonToday: boolean;
    initiallyOpen: boolean;
    /** No hay oportunidades de empleo todavía. */
    empty: boolean;
  };
  className?: string;
};

type Phase = "closed" | "cracking" | "open" | "won";

export function FortuneCookie({ fortune: initial, daily, className }: Props) {
  const [fortune, setFortune] = useState(initial);
  const [phase, setPhase] = useState<Phase>(
    daily?.wonToday ? "won" : daily?.initiallyOpen ? "open" : "closed"
  );
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function crack() {
    setPhase("cracking");
    if (daily) {
      document.cookie = `${DAILY_OPEN_COOKIE}=${daily.dayKey}; path=/; max-age=${60 * 60 * 36}; samesite=lax`;
    }
    window.setTimeout(() => setPhase("open"), 650);
  }

  function claim() {
    if (!fortune) return;
    startTransition(async () => {
      const res = await claimVictoryAction(
        fortune.opportunityId,
        fortune.key,
        Boolean(daily)
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.awarded) {
        toast.success("¡VICTORIA!", {
          description: `+${res.credits} créditos 🪙 · Total: ${res.totalCredits}`,
          duration: 5000,
        });
      }
      setLastWin(res.credits);
      if (daily) {
        // La del día es una sola: queda ganada hasta mañana.
        setPhase("won");
      } else {
        // En la oportunidad, cada victoria desbloquea la galleta siguiente.
        setFortune(res.next);
        setPhase(res.next ? "closed" : "won");
      }
    });
  }

  function hide() {
    startTransition(async () => {
      await setFortunesEnabled(false);
      toast("Galletas escondidas", {
        description: "Podés volver a prenderlas desde Configuración.",
      });
    });
  }

  const title = daily ? "GALLETA DEL DÍA" : "GALLETA DE LA VICTORIA";

  return (
    <section
      aria-label={title}
      className={cn(
        "relative overflow-hidden rounded-lg border-4 border-ink bg-komic p-4 shadow-[6px_6px_0_var(--color-ink)] halftone-yellow",
        className
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="-rotate-2 bg-ink px-2 py-0.5 font-display text-sm tracking-widest text-komic">
          🥠 {title}
        </span>
        <button
          type="button"
          onClick={hide}
          disabled={pending}
          className="ml-auto rounded-md p-1 text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink"
          title="Esconder galletas"
          aria-label="Esconder galletas"
        >
          <EyeOff className="size-4" />
        </button>
      </header>

      {phase === "won" ? (
        <WonState daily={Boolean(daily)} credits={lastWin} />
      ) : !fortune ? (
        <IdleState empty={daily?.empty ?? false} />
      ) : phase === "open" ? (
        <div className="fortune-unroll space-y-3">
          {daily ? (
            <Link
              href={`/oportunidades/${fortune.opportunityId}`}
              className="block font-display text-xs tracking-wide text-ink/70 hover:underline"
            >
              {fortune.opportunityTitle}
              {fortune.companyName ? ` · ${fortune.companyName}` : ""}
            </Link>
          ) : null}
          {/* El papelito: frase épica + misión concreta */}
          <div className="rotate-[-0.6deg] rounded-sm border-2 border-ink bg-panelw px-4 py-3 shadow-[3px_3px_0_var(--color-ink)]">
            <p className="font-display text-xl leading-tight tracking-wide text-ink">
              “{fortune.phrase}”
            </p>
            <p className="mt-2 font-hand text-base leading-snug text-ink/80">
              {fortune.mission}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {fortune.action ? (
              <Link
                href={fortune.action.href}
                className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-paper px-3 py-1.5 font-display text-sm tracking-wide text-ink transition-colors hover:bg-panelw"
              >
                {fortune.action.label}
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={claim}
              disabled={pending}
              className="btn-comic ml-auto rounded-md bg-hero px-3 py-1.5 font-display text-sm tracking-wide text-paper disabled:opacity-50"
            >
              ¡LO HICE! +{fortune.credits}
              {daily ? " +BONUS" : ""}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={crack}
          disabled={phase === "cracking"}
          className="group flex w-full items-center gap-4 text-left"
          aria-label="Romper la galleta"
        >
          <span
            className={cn(
              "burst burst-shadow flex size-20 shrink-0 items-center justify-center bg-paper text-4xl",
              phase === "cracking" ? "cookie-crack" : "float-bob"
            )}
            aria-hidden
          >
            🥠
          </span>
          <span>
            <span className="block font-display text-2xl tracking-wide text-ink">
              {phase === "cracking" ? "¡CRACK!" : "¡ROMPELA!"}
            </span>
            <span className="block font-hand text-base text-ink/70">
              Adentro está tu próxima victoria.
            </span>
          </span>
        </button>
      )}
    </section>
  );
}

function WonState({
  daily,
  credits,
}: {
  daily: boolean;
  credits: number | null;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="victory-burst burst burst-shadow flex size-20 shrink-0 items-center justify-center bg-hero text-paper">
        <Trophy className="size-8" />
      </span>
      <div>
        <p className="font-display text-2xl tracking-wide text-ink">
          ¡VICTORIA{credits ? ` +${credits}` : ""}!
        </p>
        <p className="font-hand text-base text-ink/70">
          {daily
            ? "Ganaste la galleta de hoy. Mañana hay otra."
            : "No quedan galletas acá por ahora. Cuando avance la etapa, aparece la siguiente."}
        </p>
      </div>
    </div>
  );
}

/** Sin galleta pendiente (y sin victoria recién ganada). */
function IdleState({ empty }: { empty: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="burst burst-shadow flex size-20 shrink-0 items-center justify-center bg-paper text-4xl"
        aria-hidden
      >
        🥠
      </span>
      <div>
        <p className="font-display text-2xl tracking-wide text-ink">
          {empty ? "EL HORNO ESTÁ LISTO" : "AL DÍA"}
        </p>
        <p className="font-hand text-base text-ink/70">
          {empty ? (
            <>
              Cargá tu primera búsqueda en{" "}
              <Link href="/oportunidades" className="underline">
                el tablero
              </Link>{" "}
              y empezá a ganar galletas.
            </>
          ) : (
            "No hay galletas pendientes: tu búsqueda está al día."
          )}
        </p>
      </div>
    </div>
  );
}
