"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTouchpoint } from "@/app/contactos/actions";
import { TOUCHPOINT_TYPES, touchpointTypeLabels } from "@/lib/labels";
import { toDateInputValue } from "@/lib/dates";
import type { TouchpointType } from "@/lib/generated/prisma/client";

export type OpportunityOption = { id: string; title: string };
export type ContactOption = { id: string; name: string };

export function TouchpointDialog({
  contactId,
  opportunityId,
  opportunities = [],
  contacts = [],
  defaultType = "NOTE",
  trigger,
}: {
  /** Fija el contacto (cuando se abre desde el detalle de un contacto). */
  contactId?: string;
  /** Fija la oportunidad (cuando se abre desde el detalle de una oportunidad). */
  opportunityId?: string;
  /** Oportunidades elegibles para vincular (opcional). */
  opportunities?: OpportunityOption[];
  /** Contactos elegibles para vincular (opcional). */
  contacts?: ContactOption[];
  defaultType?: TouchpointType;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTouchpoint({
        type: String(form.get("type") ?? "NOTE") as TouchpointType,
        note: String(form.get("note") ?? ""),
        occurredAt: String(form.get("occurredAt") ?? ""),
        contactId: contactId ?? String(form.get("contactId") ?? ""),
        opportunityId: opportunityId ?? String(form.get("opportunityId") ?? ""),
      });
      if (result.ok) {
        toast.success("Touchpoint registrado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar touchpoint</DialogTitle>
          <DialogDescription>
            Cada interacción cuenta: deja rastro para saber cuándo y cómo
            seguir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                name="type"
                defaultValue={defaultType}
                items={TOUCHPOINT_TYPES.map((t) => ({
                  value: t,
                  label: touchpointTypeLabels[t],
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOUCHPOINT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {touchpointTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurredAt">Fecha</Label>
              <Input
                id="occurredAt"
                name="occurredAt"
                type="date"
                defaultValue={toDateInputValue(new Date())}
              />
            </div>
          </div>
          {!contactId && contacts.length > 0 ? (
            <div className="space-y-2">
              <Label>Contacto</Label>
              <Select
                name="contactId"
                defaultValue=""
                items={[
                  { value: "", label: "Sin contacto" },
                  ...contacts.map((c) => ({ value: c.id, label: c.name })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin contacto</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {!opportunityId && opportunities.length > 0 ? (
            <div className="space-y-2">
              <Label>Oportunidad (opcional)</Label>
              <Select
                name="opportunityId"
                defaultValue=""
                items={[
                  { value: "", label: "Sin oportunidad" },
                  ...opportunities.map((o) => ({
                    value: o.id,
                    label: o.title,
                  })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin oportunidad</SelectItem>
                  {opportunities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="note">Nota</Label>
            <Textarea
              id="note"
              name="note"
              rows={3}
              placeholder="¿Qué pasó? ¿Quedó algo pendiente?"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
