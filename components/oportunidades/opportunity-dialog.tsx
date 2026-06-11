"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
  createOpportunity,
  updateOpportunity,
  type OpportunityInput,
} from "@/app/oportunidades/actions";
import { createCVVersion } from "@/app/configuracion/actions";
import {
  STAGES,
  stageLabels,
  PRIORITIES,
  priorityLabels,
} from "@/lib/labels";
import { toDateInputValue } from "@/lib/dates";
import type {
  Opportunity,
  Stage,
  Priority,
} from "@/lib/generated/prisma/client";

export type CompanyOption = { id: string; name: string };
export type CVVersionOption = { id: string; label: string };

export function OpportunityDialog({
  opportunity,
  companies,
  cvVersions,
  defaultCompanyId,
  trigger,
}: {
  opportunity?: Opportunity;
  companies: CompanyOption[];
  cvVersions: CVVersionOption[];
  defaultCompanyId?: string;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(opportunity);

  // Quick-create de versión de CV sin salir del form
  const [cvOptions, setCvOptions] = useState(cvVersions);
  const [cvVersionId, setCvVersionId] = useState(
    opportunity?.cvVersionId ?? ""
  );
  const [creatingCv, setCreatingCv] = useState(false);
  const [newCvLabel, setNewCvLabel] = useState("");

  function handleQuickCreateCv() {
    if (!newCvLabel.trim()) return;
    startTransition(async () => {
      const result = await createCVVersion({ label: newCvLabel });
      if (result.ok) {
        setCvOptions((prev) => [...prev, { id: result.id, label: newCvLabel }]);
        setCvVersionId(result.id);
        setCreatingCv(false);
        setNewCvLabel("");
        toast.success("Versión de CV creada.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input: OpportunityInput = {
      title: String(form.get("title") ?? ""),
      companyId: String(form.get("companyId") ?? ""),
      stage: String(form.get("stage") ?? "SAVED") as Stage,
      url: String(form.get("url") ?? ""),
      location: String(form.get("location") ?? ""),
      salaryRange: String(form.get("salaryRange") ?? ""),
      jobDescription: String(form.get("jobDescription") ?? ""),
      priority: String(form.get("priority") ?? "MEDIUM") as Priority,
      appliedAt: String(form.get("appliedAt") ?? ""),
      nextFollowUpAt: String(form.get("nextFollowUpAt") ?? ""),
      cvVersionId,
      notes: String(form.get("notes") ?? ""),
    };
    startTransition(async () => {
      const result = opportunity
        ? await updateOpportunity(opportunity.id, input)
        : await createOpportunity(input);
      if (result.ok) {
        toast.success(
          isEdit ? "Oportunidad actualizada." : "Oportunidad creada."
        );
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar oportunidad" : "Nueva oportunidad"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos de la oportunidad."
              : "Guardá la búsqueda y empezá a moverla por el embudo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={opportunity?.title ?? ""}
              placeholder="Ej.: Backend Engineer Ssr"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                name="companyId"
                defaultValue={opportunity?.companyId ?? defaultCompanyId ?? ""}
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
              <Label>Etapa</Label>
              <Select
                name="stage"
                defaultValue={opportunity?.stage ?? "SAVED"}
                items={STAGES.map((s) => ({
                  value: s,
                  label: stageLabels[s],
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {stageLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                name="priority"
                defaultValue={opportunity?.priority ?? "MEDIUM"}
                items={PRIORITIES.map((p) => ({
                  value: p,
                  label: priorityLabels[p],
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                name="location"
                defaultValue={opportunity?.location ?? ""}
                placeholder="Ej.: Remoto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryRange">Rango salarial</Label>
              <Input
                id="salaryRange"
                name="salaryRange"
                defaultValue={opportunity?.salaryRange ?? ""}
                placeholder="Ej.: USD 3.000 - 4.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Link del aviso</Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={opportunity?.url ?? ""}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appliedAt">Fecha de aplicación</Label>
              <Input
                id="appliedAt"
                name="appliedAt"
                type="date"
                defaultValue={toDateInputValue(opportunity?.appliedAt)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextFollowUpAt">Próximo follow-up</Label>
              <Input
                id="nextFollowUpAt"
                name="nextFollowUpAt"
                type="date"
                defaultValue={toDateInputValue(opportunity?.nextFollowUpAt)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Versión de CV</Label>
            {creatingCv ? (
              <div className="flex gap-2">
                <Input
                  value={newCvLabel}
                  onChange={(e) => setNewCvLabel(e.target.value)}
                  placeholder="Etiqueta, ej.: CV Backend 2026"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleQuickCreateCv}
                  disabled={pending || !newCvLabel.trim()}
                >
                  Crear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreatingCv(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={cvVersionId}
                  onValueChange={(v) => setCvVersionId(v ?? "")}
                  items={[
                    { value: "", label: "Sin versión de CV" },
                    ...cvOptions.map((cv) => ({
                      value: cv.id,
                      label: cv.label,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin versión de CV</SelectItem>
                    {cvOptions.map((cv) => (
                      <SelectItem key={cv.id} value={cv.id}>
                        {cv.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCreatingCv(true)}
                  title="Crear nueva versión de CV"
                >
                  <Plus className="size-4" />
                  Nueva
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Descripción del puesto</Label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              rows={4}
              defaultValue={opportunity?.jobDescription ?? ""}
              placeholder="Pegá acá la descripción del aviso..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={opportunity?.notes ?? ""}
              placeholder="Estado del proceso, impresiones, pendientes..."
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
