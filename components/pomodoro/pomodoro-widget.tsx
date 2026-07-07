"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Shuffle,
  ChevronDown,
} from "lucide-react";
import posthog from "posthog-js";
import { getVocab, isTrack, DEFAULT_TRACK, type Track } from "@/lib/tracks";
import { getFocusSuggestions } from "@/app/(app)/pomodoro-actions";
import { cn } from "@/lib/utils";

// Pomodoro ACOPLADO al sidebar (Server layout lo monta dentro del riel/drawer).
// Es un panel compacto y colapsable: la cabecera con el reloj y play/pausa
// siempre visible; al expandir aparecen fases, presets y la sugerencia de foco.
// Guarda su estado en localStorage con un `endsAt` ABSOLUTO, para que el tiempo
// siga corriendo aunque recargues la página o cambies de sección.

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
  open: boolean; // panel expandido
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
    `Anotá en la Actividad un avance del proyecto: qué hiciste y qué sigue.`,
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

  const [open, setOpen] = useState(false); // panel expandido (false = "chiquito")
  const [phase, setPhase] = useState<Phase>("focus");
  const [focusMin, setFocusMin] = useState(40);
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState(40 * 60);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  // Sugerencias con DATOS REALES (follow-ups vencidos, tareas, etc.). Se cargan
  // la primera vez que abrís el panel; si no hay, caemos a las genéricas.
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

  // Restaurar estado al montar (después de hidratar, para no romper SSR).
  useEffect(() => {
    const p = loadPersisted();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (p) {
      setPhase(p.phase);
      setFocusMin(p.focusMin);
      setOpen(p.open);
      if (p.running && p.endsAt != null) {
        if (Date.now() >= p.endsAt) {
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

  // Cargar sugerencias reales cada vez que expandís el panel (y al cambiar de
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

  // Instrumentación: emitimos SOLO al expandir el panel (no al colapsar, y nunca
  // en el mount, que ocurre en todas las páginas por estar acoplado al sidebar).
  // Sin esto no hay forma de medir el uso real de Pomodoro: no es una ruta y no
  // persiste nada en Postgres. Calculamos fuera del updater de setState para no
  // duplicar el evento bajo StrictMode. distinct_id ya lo setea el provider vía
  // identify(userId); no-op y a prueba de fallos si PostHog no está inicializado.
  function toggleOpen() {
    const next = !open;
    if (next) {
      try {
        posthog.capture("pomodoro_opened", { track });
      } catch {
        // la analítica nunca debe romper el widget
      }
    }
    setOpen(next);
  }

  return (
    <div className="border-t-[3px] border-sidebar-border p-3">
      {/* Cabecera compacta (siempre visible): reloj + play/pausa + expandir */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-sidebar-accent"
          title={open ? "Ocultar Pomodoro" : "Mostrar Pomodoro"}
        >
          <Timer className="size-4 shrink-0" />
          <span className="font-display text-[11px] tracking-[0.15em] text-sidebar-foreground/70">
            {phase === "focus" ? "FOCO" : "RECREO"}
          </span>
          <span className="ml-auto font-display text-base tabular-nums">
            {mmss(remaining)}
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={() => (running ? pause() : start())}
          aria-label={running ? "Pausar" : "Empezar"}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border-[2.5px] border-paper bg-sidebar-accent text-sidebar-foreground transition-transform active:translate-y-px"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>

      {/* Barra de progreso fina (siempre visible) */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sidebar-accent">
        <div
          className="h-full rounded-full bg-komic transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>

      {/* Panel expandido */}
      {open ? (
        <div className="mt-3 space-y-3">
          {/* Fase */}
          <div className="flex gap-1 rounded-md border-[2.5px] border-paper p-0.5">
            {(["focus", "break"] as Phase[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => switchPhase(p)}
                className={cn(
                  "flex-1 rounded px-2 py-1 font-display text-[11px] tracking-wide transition-colors",
                  phase === p
                    ? "bg-komic text-ink"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                )}
              >
                {p === "focus" ? "FOCO" : "RECREO"}
              </button>
            ))}
          </div>

          {/* Presets de foco */}
          {phase === "focus" ? (
            <div className="flex items-center justify-center gap-1.5">
              {FOCUS_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickFocusMin(m)}
                  disabled={running}
                  className={cn(
                    "flex-1 rounded-md border-2 px-2 py-1 font-display text-[11px] tracking-wide transition-colors disabled:opacity-40",
                    focusMin === m
                      ? "border-paper bg-komic text-ink"
                      : "border-sidebar-border text-sidebar-foreground/60 hover:border-paper"
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          ) : null}

          {/* Controles */}
          <div className="flex items-center gap-1.5">
            {running ? (
              <button
                type="button"
                onClick={pause}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-[2.5px] border-paper bg-alarm px-2 py-1.5 font-display text-xs tracking-wide text-paper"
              >
                <Pause className="size-3.5" /> PAUSAR
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-[2.5px] border-paper bg-komic px-2 py-1.5 font-display text-xs tracking-wide text-ink"
              >
                <Play className="size-3.5" />
                {remaining < totalForPhase ? "SEGUIR" : "EMPEZAR"}
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              aria-label="Reiniciar"
              className="flex size-8 shrink-0 items-center justify-center rounded-md border-[2.5px] border-paper bg-sidebar-accent"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={enableNotifications}
              aria-label="Activar notificaciones"
              title="Activar notificaciones"
              className="flex size-8 shrink-0 items-center justify-center rounded-md border-[2.5px] border-paper bg-sidebar-accent"
            >
              <Bell className="size-3.5" />
            </button>
          </div>

          {/* Sugerencia de foco */}
          {phase === "focus" ? (
            <div className="rounded-md border-2 border-dashed border-sidebar-border p-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-display text-[9px] tracking-[0.15em] text-sidebar-foreground/50">
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
                  className="text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
                >
                  <Shuffle className="size-3" />
                </button>
              </div>
              <p className="text-xs leading-snug text-sidebar-foreground/90">
                {currentSuggestion}
              </p>
            </div>
          ) : (
            <p className="text-center font-hand text-xs text-sidebar-foreground/70">
              Estirá las piernas, tomá agua y volvé recargado. 💧
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
