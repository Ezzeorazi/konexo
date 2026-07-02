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
import {
  createContact,
  updateContact,
  type ContactInput,
} from "@/app/(app)/contactos/actions";
import {
  RELATIONSHIP_STRENGTHS,
  relationshipStrengthLabels,
} from "@/lib/labels";
import { toDateTimeInputValue } from "@/lib/dates";
import type {
  Contact,
  RelationshipStrength,
} from "@/lib/generated/prisma/client";
import type { Track } from "@/lib/tracks";

export type CompanyOption = { id: string; name: string };

export function ContactDialog({
  contact,
  companies,
  defaultCompanyId,
  track = "jobs",
  trigger,
}: {
  contact?: Contact;
  companies: CompanyOption[];
  defaultCompanyId?: string;
  track?: Track;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(contact);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input: ContactInput = {
      name: String(form.get("name") ?? ""),
      track: contact?.track ?? track,
      role: String(form.get("role") ?? ""),
      companyId: String(form.get("companyId") ?? ""),
      email: String(form.get("email") ?? ""),
      linkedinUrl: String(form.get("linkedinUrl") ?? ""),
      phone: String(form.get("phone") ?? ""),
      relationshipStrength: String(
        form.get("relationshipStrength") ?? "COLD"
      ) as RelationshipStrength,
      nextFollowUpAt: String(form.get("nextFollowUpAt") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    startTransition(async () => {
      const result = contact
        ? await updateContact(contact.id, input)
        : await createContact(input);
      if (result.ok) {
        toast.success(isEdit ? "Contacto actualizado." : "Contacto creado.");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar contacto" : "Nuevo contacto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos del contacto."
              : "Sumá una persona a tu red. Cada contacto puede abrirte una puerta."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={contact?.name ?? ""}
                placeholder="Ej.: Lucía Fernández"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Input
                id="role"
                name="role"
                defaultValue={contact?.role ?? ""}
                placeholder="Ej.: Engineering Manager"
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                name="companyId"
                defaultValue={contact?.companyId ?? defaultCompanyId ?? ""}
                items={[
                  { value: "", label: "Sin empresa" },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin empresa</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Relación</Label>
              <Select
                name="relationshipStrength"
                defaultValue={contact?.relationshipStrength ?? "COLD"}
                items={RELATIONSHIP_STRENGTHS.map((s) => ({
                  value: s,
                  label: relationshipStrengthLabels[s],
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_STRENGTHS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {relationshipStrengthLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={contact?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={contact?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn</Label>
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                type="text"
                inputMode="url"
                defaultValue={contact?.linkedinUrl ?? ""}
                placeholder="linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextFollowUpAt">Próximo follow-up</Label>
              <Input
                id="nextFollowUpAt"
                name="nextFollowUpAt"
                type="datetime-local"
                defaultValue={toDateTimeInputValue(contact?.nextFollowUpAt)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={contact?.notes ?? ""}
              placeholder="Cómo se conocieron, contexto, favores pendientes..."
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
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
