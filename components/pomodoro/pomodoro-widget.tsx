"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Timer, X, Play, Pause, RotateCcw, Bell, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVocab, isTrack, DEFAULT_TRACK, type Track } from "@/lib/tracks";
import { getFocusSuggestions } from "@/app/(app)/pomodoro-actions";
import { cn } from "@/lib/utils";

// Widget de Pomodoro. Vive en el layout de la app (persiste entre navegaciones)
// y guarda su estado en localStorage con un `endsAt` ABSOLUTO, para que el
// tiempo siga corriendo aunque recargues la página o cambies de sección.

type Phase = "focus" | "break";

const BREAK_MIN = 10;
const FOCUS_PRESETS = [25, 40, 50] as const;
const STORAGE_KEY = "konexo-pomodoro-v1";

type Persisted = {
  phase: Phase;
  focusMin: number;
  running: boolean;
  endsAt: number | null;
  pausedRemaining: number; // segundos restantes cuando está pausado
  open: boolean;
};

function loadPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Sugerencias de qué hacer en el bloque de foco, teñidas por el modo activo.
function buildSuggestions(track: Track): string[] {
  const v = getVocab(track);
  const opp = v.oppSingular;
  const companies = v.companyPlural.toLowerCase();
  const base = [
    `Ponete al día con un follow-up vencido y mandá el mensaje que quedó pendiente.`,
    `Revisá tu tablero y avanzá una ${opp} a la etapa siguiente.`,
    `Registrá los touchpoints de charlas o mails de los últimos días.`,
    `Sumá 3 ${companies} nuevas a tu radar y buscales un contacto.`,
    `Preparate para tu próxima reunión: repasá el historial del contacto.`,
    `Depurá el pipeline: cerrá lo que ya no va y priorizá lo caliente.`,
    `Escribí un mensaje de seguimiento para tu ${opp} más importante.`,
    `Anotá en la bitácora qué avanzaste hoy y qué sigue.`,
  ];
  if (v.usesCv) {
    base.push(`Adaptá tu CV a una ${opp} concreta y guardá la versión.`);
  }
  if (v.hasDelivery) {
    base.push(`Cerrá una tarea o hito del proyecto que tengas a mano.`);
  }
  return base;
}

export function PomodoroWidget({ activeTrack }: { activeTrack: Track }) {
  const track = isTrack(activeTrack) ? activeTrack : DEFAULT_TRACK;

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("focus");
  const [focusMin, setFocusMin] = useState(40);
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState(40 * 60);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  // Sugerencias con DATOS REALES (follow-ups vencidos, tareas, etc.). Se cargan
  // la primera vez que abrís el widget; si no hay, caemos a las genéricas.
  const [dataSuggestions, setDataSuggestions] = useState<string[] | null>(null);

  // Genéricas por modo (fallback), sin efecto: puro dato.
  const fallback = useMemo(() => buildSuggestions(track), [track]);
  const suggestions =
    dataSuggestions && dataSuggestions.length > 0 ? dataSuggestions : fallback;

  const totalForPhase = (phase === "focus" ? focusMin : BREAK_MIN) * 60;
  const remaining =
    running && endsAt != null
      ? Math.max(0, Math.ceil((endsAt - now) / 1000))
      : pausedRemaining;
  const progress = 1 - remaining / totalForPhase;

  // Restaurar estado al montar (después de hidratar, para no romper SSR). El
  // estado del timer solo existe en el cliente: leerlo en un effect de montaje
  // es el patrón correcto (mismo enfoque que el ChatWidget).
  useEffect(() => {
    const p = loadPersisted();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (p) {
      setPhase(p.phase);
      setFocusMin(p.focusMin);
      setOpen(p.open);
      if (p.running && p.endsAt != null) {
        if (Date.now() >= p.endsAt) {
          // El bloque terminó mientras no estabas: lo dejamos listo en la
          // siguiente fase, en pausa.
          const next: Phase = p.phase === "focus" ? "break" : "focus";
          setPhase(next);
          setPausedRemaining((next === "focus" ? p.focusMin : BREAK_MIN) * 60);
        } else {
          setRunning(true);
          setEndsAt(p.endsAt);
        }
      } else {
        setPausedRemaining(p.pausedRemaining);
      }
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Cargar sugerencias reales cada vez que abrís el widget (y al cambiar de
  // modo mientras está abierto): así reflejan follow-ups y tareas al día.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getFocusSuggestions()
      .then((s) => {
        if (!cancelled) setDataSuggestions(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, track]);

  // Persistir cambios (solo una vez hidratado, para no pisar lo guardado).
  useEffect(() => {
    if (!hydrated) return;
    const data: Persisted = {
      phase,
      focusMin,
      running,
      endsAt,
      pausedRemaining,
      open,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // sin storage: el timer igual funciona en esta sesión.
    }
  }, [hydrated, phase, focusMin, running, endsAt, pausedRemaining, open]);

  const notify = useCallback((finished: Phase) => {
    const title =
      finished === "focus"
        ? "¡Bloque de foco completo! 🎉"
        : "Se terminó el recreo ⏱️";
    const body =
      finished === "focus"
        ? "Tomate un recreo. Te lo ganaste."
        : "A concentrarse en el próximo bloque.";
    toast.success(title, { description: body });
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(title, { body, icon: "/favicon-konexo.webp" });
      }
    } catch {
      // Notificaciones no disponibles: alcanza con el toast.
    }
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // sin audio: el toast/notificación alcanzan.
    }
  }, []);

  const complete = useCallback(() => {
    setRunning(false);
    setEndsAt(null);
    notify(phase);
    if (phase === "focus") {
      setPhase("break");
      setPausedRemaining(BREAK_MIN * 60);
    } else {
      setPhase("focus");
      setPausedRemaining(focusMin * 60);
      setSuggestionIdx((i) =>
        suggestions.length ? (i + 1) % suggestions.length : 0
      );
    }
  }, [notify, phase, focusMin, suggestions.length]);

  // Ref con la última versión de `complete`, para el interval.
  const completeRef = useRef(complete);
  useEffect(() => {
    completeRef.current = complete;
  });

  // Tick mientras corre. Comparamos contra `endsAt` (reloj de pared), así no
  // importa si el intervalo se atrasa o la pestaña estuvo en segundo plano.
  useEffect(() => {
    if (!running || endsAt == null) return;
    const id = setInterval(() => {
      if (Date.now() >= endsAt) {
        completeRef.current();
      } else {
        setNow(Date.now());
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, endsAt]);

  function start() {
    const secs = pausedRemaining > 0 ? pausedRemaining : totalForPhase;
    setNow(Date.now());
    setEndsAt(Date.now() + secs * 1000);
    setRunning(true);
    // Pedimos permiso de notificación la primera vez que arrancás.
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission().catch(() => {});
      }
    } catch {
      // ignorar
    }
  }

  function pause() {
    setPausedRemaining(remaining);
    setRunning(false);
    setEndsAt(null);
  }

  function reset() {
    setRunning(false);
    setEndsAt(null);
    setPausedRemaining(totalForPhase);
  }

  function switchPhase(next: Phase) {
    setRunning(false);
    setEndsAt(null);
    setPhase(next);
    setPausedRemaining((next === "focus" ? focusMin : BREAK_MIN) * 60);
  }

  function pickFocusMin(min: number) {
    setFocusMin(min);
    if (phase === "focus" && !running) setPausedRemaining(min * 60);
  }

  function enableNotifications() {
    try {
      if (typeof Notification === "undefined") {
        toast.error("Tu navegador no soporta notificaciones.");
        return;
      }
      if (Notification.permission === "granted") {
        toast.success("Las notificaciones ya están activas.");
        return;
      }
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") toast.success("Notificaciones activadas.");
      });
    } catch {
      // ignorar
    }
  }

  const currentSuggestion = suggestions.length
    ? suggestions[suggestionIdx % suggestions.length]
    : "";

  if (!open) {
    return (
      <Button
        size="icon-lg"
        variant="outline"
        className="fixed bottom-5 left-5 z-40 size-12 rounded-full bg-background shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Timer className="size-5" />
        {running ? (
          <span className="absolute -top-1 -right-1 rounded-full border-2 border-background bg-hero px-1.5 py-0.5 font-display text-[10px] leading-none text-paper">
            {mmss(remaining)}
          </span>
        ) : null}
        <span className="sr-only">Abrir temporizador de foco</span>
      </Button>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 z-40 w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl bg-popover shadow-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-primary" />
          <p className="text-sm font-medium">Foco Pomodoro</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={enableNotifications}
            title="Activar notificaciones"
          >
            <Bell className="size-4" />
            <span className="sr-only">Activar notificaciones</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
            <X className="size-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Selector de fase */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["focus", "break"] as Phase[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => switchPhase(p)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                phase === p
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "focus" ? "Foco" : "Recreo"}
            </button>
          ))}
        </div>

        {/* Reloj */}
        <div className="text-center">
          <p className="font-display text-6xl tracking-wider tabular-nums text-ink">
            {mmss(remaining)}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-hero transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>

        {/* Presets de foco */}
        {phase === "focus" ? (
          <div className="flex items-center justify-center gap-2">
            {FOCUS_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickFocusMin(m)}
                disabled={running}
                className={cn(
                  "rounded-md border-2 px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                  focusMin === m
                    ? "border-ink bg-komic text-ink"
                    : "border-muted text-muted-foreground hover:border-ink"
                )}
              >
                {m} min
              </button>
            ))}
          </div>
        ) : null}

        {/* Controles */}
        <div className="flex items-center justify-center gap-2">
          {running ? (
            <Button onClick={pause} className="flex-1">
              <Pause className="size-4" />
              Pausar
            </Button>
          ) : (
            <Button onClick={start} className="flex-1">
              <Play className="size-4" />
              {remaining < totalForPhase ? "Seguir" : "Empezar"}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={reset} title="Reiniciar">
            <RotateCcw className="size-4" />
            <span className="sr-only">Reiniciar</span>
          </Button>
        </div>

        {/* Sugerencia para el bloque de foco */}
        {phase === "focus" ? (
          <div className="rounded-lg border border-dashed p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-display text-[10px] tracking-[0.18em] text-muted-foreground">
                EN ESTOS {focusMin} MIN
              </p>
              <button
                type="button"
                onClick={() =>
                  setSuggestionIdx((i) =>
                    suggestions.length ? (i + 1) % suggestions.length : 0
                  )
                }
                title="Otra sugerencia"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Shuffle className="size-3.5" />
              </button>
            </div>
            <p className="text-sm">{currentSuggestion}</p>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Estirá las piernas, tomá agua y volvé recargado. 💧
          </p>
        )}
      </div>
    </div>
  );
}
