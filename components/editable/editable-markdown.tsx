"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";
import type { SaveHandler } from "./types";

type EditableMarkdownProps = {
  /** Markdown crudo. Se guarda tal cual: no se transforma (limpio para la IA). */
  value: string;
  onSave: SaveHandler;
  placeholder?: string;
  maxLength?: number;
  /** Clases del contenedor de la vista renderizada. */
  className?: string;
  ariaLabel?: string;
};

export function EditableMarkdown({
  value,
  onSave,
  placeholder = "Agregar una nota… (soporta Markdown)",
  maxLength = 20000,
  className,
  ariaLabel,
}: EditableMarkdownProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [optimistic, setOptimistic] = useState<string | null>(null);

  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setOptimistic(null);
  }

  // Auto-resize: la altura sigue al contenido mientras se edita.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (editing && el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, draft]);

  function startEditing() {
    setDraft(optimistic ?? value);
    setEditing(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  function commit() {
    // No recortamos el interior: solo bordes, para no mutar el Markdown del medio.
    const next = draft.replace(/\s+$/, "").replace(/^\n+/, "");
    setEditing(false);

    if (next === (value ?? "")) return;

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
        toast.error("No se pudo guardar la nota.");
      })
      .finally(() => setSaving(false));
  }

  function cancel() {
    setDraft(optimistic ?? value);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        maxLength={maxLength}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          // Enter inserta salto (es Markdown). Ctrl/⌘+Enter guarda; Escape cancela.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder={placeholder}
        rows={3}
        className={cn(
          "w-full resize-none rounded-md bg-background px-2 py-1.5 font-mono text-sm leading-relaxed outline-none ring-2 ring-ring/60",
          className
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
      aria-label={ariaLabel ?? "Editar nota"}
      data-saving={saving || undefined}
      className={cn(
        "block w-full cursor-text rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none data-[saving]:opacity-60",
        isEmpty && "text-muted-foreground",
        className
      )}
    >
      {isEmpty ? placeholder : <div className="space-y-1">{renderMarkdown(shown)}</div>}
    </button>
  );
}
