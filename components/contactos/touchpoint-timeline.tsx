"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { TouchpointTypeBadge } from "@/components/badges";
import { EditableText } from "@/components/editable/editable-text";
import { EditableSelect } from "@/components/editable/editable-select";
import {
  updateTouchpoint,
  deleteTouchpoint,
} from "@/app/(app)/contactos/actions";
import { TOUCHPOINT_TYPES, touchpointTypeLabels } from "@/lib/labels";
import { formatDate, toDateInputValue } from "@/lib/dates";
import type { TouchpointType } from "@/lib/generated/prisma/client";

export type TimelineTouchpoint = {
  id: string;
  type: TouchpointType;
  note: string | null;
  occurredAt: Date;
  /** Entidad ligada a mostrar (la oportunidad desde el contacto, o viceversa). */
  link?: { href: string; label: string } | null;
};

// Timeline de touchpoints editable in-context: el tipo, la fecha y la nota se
// editan haciendo click sobre el propio valor (mismo patrón que el resto de la
// app), sin abrir un formulario.
export function TouchpointTimeline({ items }: { items: TimelineTouchpoint[] }) {
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {items.map((tp) => (
        <TouchpointRow key={tp.id} tp={tp} />
      ))}
    </ol>
  );
}

function TouchpointRow({ tp }: { tp: TimelineTouchpoint }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm("¿Eliminar este touchpoint?")) return;
    startTransition(async () => {
      const res = await deleteTouchpoint(tp.id);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <li className="relative" data-pending={pending || undefined}>
      <span className="absolute left-[-1.85rem] top-1.5 size-2.5 rounded-full bg-primary" />
      <div className="flex flex-wrap items-center gap-2">
        <EditableSelect
          value={tp.type}
          ariaLabel="Cambiar tipo de touchpoint"
          options={TOUCHPOINT_TYPES.map((t) => ({
            value: t,
            label: touchpointTypeLabels[t],
          }))}
          renderValue={(v) => (
            <TouchpointTypeBadge type={v as TouchpointType} />
          )}
          onSave={(v) =>
            updateTouchpoint(tp.id, { type: v as TouchpointType })
          }
        />
        <EditableText
          value={toDateInputValue(tp.occurredAt)}
          display={formatDate(tp.occurredAt)}
          type="date"
          ariaLabel="Editar fecha del touchpoint"
          className="text-xs text-muted-foreground"
          onSave={(v) => updateTouchpoint(tp.id, { occurredAt: v })}
        />
        {tp.link ? (
          <Link
            href={tp.link.href}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {tp.link.label}
          </Link>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label="Eliminar touchpoint"
          className="ml-auto text-muted-foreground transition-colors hover:text-alarm disabled:opacity-30"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="mt-1.5">
        <EditableText
          value={tp.note ?? ""}
          multiline
          placeholder="Agregar una nota…"
          ariaLabel="Editar nota del touchpoint"
          className="text-sm"
          onSave={(v) => updateTouchpoint(tp.id, { note: v })}
        />
      </div>
    </li>
  );
}
