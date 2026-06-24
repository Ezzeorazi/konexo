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
  createCompany,
  updateCompany,
  type CompanyInput,
} from "@/app/(app)/empresas/actions";
import type { Company } from "@/lib/generated/prisma/client";
import type { Track } from "@/lib/tracks";

export function CompanyDialog({
  company,
  track = "jobs",
  trigger,
}: {
  company?: Company;
  track?: Track;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(company);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input: CompanyInput = {
      name: String(form.get("name") ?? ""),
      track: company?.track ?? track,
      website: String(form.get("website") ?? ""),
      location: String(form.get("location") ?? ""),
      industry: String(form.get("industry") ?? ""),
      source: String(form.get("source") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    startTransition(async () => {
      const result = company
        ? await updateCompany(company.id, input)
        : await createCompany(input);
      if (result.ok) {
        toast.success(isEdit ? "Empresa actualizada." : "Empresa creada.");
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
          <DialogTitle>{isEdit ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos de la empresa."
              : "Cargá una empresa para vincularla a oportunidades y contactos."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={company?.name ?? ""}
              placeholder="Ej.: Mercado Libre"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Sitio web</Label>
              <Input
                id="website"
                name="website"
                type="text"
                inputMode="url"
                defaultValue={company?.website ?? ""}
                placeholder="ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                name="location"
                defaultValue={company?.location ?? ""}
                placeholder="Ej.: Remoto (LATAM)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industria</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={company?.industry ?? ""}
                placeholder="Ej.: SaaS B2B"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Fuente</Label>
              <Input
                id="source"
                name="source"
                defaultValue={company?.source ?? ""}
                placeholder="Ej.: LinkedIn, referido"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={company?.notes ?? ""}
              placeholder="Cultura, procesos, datos útiles..."
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
