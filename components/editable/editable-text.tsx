"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SaveHandler } from "./types";

type EditableTextProps = {
  /** Valor crudo que se edita (lo que viaja al server). */
  value: string;
  onSave: SaveHandler;
  /** Render alternativo para mostrar (fecha formateada, monto, etc.). */
  display?: React.ReactNode;
  type?: "text" | "date" | "datetime-local" | "number" | "url" | "email";
  /** Texto plano de varias líneas (textarea auto-resize). */
  multiline?: boolean;
  placeholder?: string;
  /** Texto tenue cuando no hay valor. Por defecto "—". */
  emptyLabel?: string;
  /** Si es true, no guarda vacío: revierte al valor anterior. */
  required?: boolean;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  /** Clases del texto cuando NO está en edición. */
  className?: string;
  /** Clases del input cuando está en edición. */
  inputClassName?: string;
  ariaLabel?: string;
};

export function EditableText({
  value,
  onSave,
  display,
  type = "text",
  multiline = false,
  placeholder,
  emptyLabel = "—",
  required = false,
  maxLength,
  inputMode,
  className,
  inputClassName,
  ariaLabel,
}: EditableTextProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  // Valor que se muestra mientras el server revalida (UI optimista).
  const [optimistic, setOptimistic] = useState<string | null>(null);
  // Patrón "adjusting state during render": cuando llegan datos frescos del
  // server (cambia el prop), descartamos el valor optimista.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setOptimistic(null);
  }

  // Auto-resize del textarea (solo modo multilínea).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (multiline && editing && el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [multiline, editing, draft]);

  function startEditing() {
    setDraft(optimistic ?? value);
    setEditing(true);
    // Enfocar tras el render.
    requestAnimationFrame(() => {
      const el = multiline ? textareaRef.current : inputRef.current;
      el?.focus();
      if (multiline) {
        const len = textareaRef.current?.value.length ?? 0;
        textareaRef.current?.setSelectionRange(len, len);
      } else {
        inputRef.current?.select();
      }
    });
  }

  function commit() {
    const next = draft.trim();
    setEditing(false);

    if (next === (value ?? "")) return; // sin cambios
    if (required && next === "") {
      setDraft(value);
      toast.error("Este campo no puede quedar vacío.");
      return;
    }

    setOptimistic(next);
    setSaving(true);
    onSave(next)
      .then((result) => {
        if (result.ok) {
          router.refresh();
        } else {
          setOptimistic(null);
          toast.error(result.error);
        }
      })
      .catch(() => {
        setOptimistic(null);
        toast.error("No se pudo guardar el cambio.");
      })
      .finally(() => setSaving(false));
  }

  function cancel() {
    setDraft(optimistic ?? value);
    setEditing(false);
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={draft}
          maxLength={maxLength}
          aria-label={ariaLabel}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            // Enter inserta salto; Escape cancela; el guardado es al perder foco.
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          placeholder={placeholder}
          className={cn(
            "w-full resize-none rounded-md bg-background px-2 py-1.5 text-sm leading-relaxed outline-none ring-2 ring-ring/60 transition-colors",
            inputClassName
          )}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder={placeholder}
        className={cn(
          "w-full min-w-0 rounded-md bg-background px-1.5 py-0.5 text-sm outline-none ring-2 ring-ring/60 transition-colors",
          inputClassName
        )}
      />
    );
  }

  const shown = optimistic ?? value;
  const isEmpty = !shown || shown.trim() === "";

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={ariaLabel ?? "Editar"}
      data-saving={saving || undefined}
      className={cn(
        "-mx-1.5 block cursor-text rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none data-[saving]:opacity-60",
        multiline && "whitespace-pre-wrap",
        isEmpty && "text-muted-foreground",
        className
      )}
    >
      {isEmpty ? placeholder ?? emptyLabel : optimistic ?? display ?? shown}
    </button>
  );
}
