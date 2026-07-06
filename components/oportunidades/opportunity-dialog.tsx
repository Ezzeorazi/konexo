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
} from "@/app/(app)/oportunidades/actions";
import { createCVVersion } from "@/app/(app)/configuracion/actions";
import { PRIORITIES, priorityLabels, PROJECT_KINDS, projectKindLabels } from "@/lib/labels";
import {
  getVocab,
  isTrack,
  defaultStageKeyOf,
  type Track,
  type StageDef,
} from "@/lib/tracks";
import { toDateInputValue, toDateTimeInputValue } from "@/lib/dates";
import type { Opportunity, Priority } from "@/lib/generated/prisma/client";

export type CompanyOption = { id: string; name: string };
export type CVVersionOption = { id: string; label: string };

export function OpportunityDialog({
  opportunity,
  companies,
  cvVersions,
  defaultCompanyId,
  track = "jobs",
  stages,
  trigger,
}: {
  opportunity?: Opportunity;
  companies: CompanyOption[];
  cvVersions: CVVersionOption[];
  defaultCompanyId?: string;
  track?: Track;
  stages: StageDef[];
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(opportunity);
  // En edición respetamos el track guardado de la oportunidad; en alta, el activo.
  const formTrack: Track = isTrack(opportunity?.track)
    ? opportunity.track
    : track;
  const vocab = getVocab(formTrack);

  // Tipo de proyecto (solo en tracks con entrega). Reactivo: al elegir PROPIO
  // vs DE CLIENTE cambian qué campos se piden (un proyecto propio no tiene
  // cliente ni monto a cobrar).
  const [kind, setKind] = useState<string>(
    opportunity?.kind === "own" ? "own" : "client"
  );
  const isOwn = vocab.hasDelivery && kind === "own";
  const companyLabel =
    vocab.companySingular.charAt(0).toUpperCase() +
    vocab.companySingular.slice(1);

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
      track: formTrack,
      // Un proyecto propio no tiene cliente: no mostramos el campo y lo limpiamos.
      companyId: isOwn ? "" : String(form.get("companyId") ?? ""),
      stage: String(form.get("stage") ?? defaultStageKeyOf(stages)),
      kind,
      url: String(form.get("url") ?? ""),
      location: String(form.get("location") ?? ""),
      salaryRange: String(form.get("salaryRange") ?? ""),
      value: String(form.get("value") ?? ""),
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
        toast.success(isEdit ? "Cambios guardados." : "Guardado.");
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
            {isEdit ? `Editar ${vocab.oppSingular}` : vocab.newOpp}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Actualizá los datos del ${vocab.oppSingular}.`
              : `Cargá ${vocab.oppSingular} y empezá a moverlo por el embudo.`}
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
              placeholder={
                vocab.hasValue
                  ? "Ej.: Cuenta Acme"
                  : "Ej.: Backend Engineer Ssr"
              }
            />
          </div>
          {vocab.hasDelivery ? (
            <div className="space-y-2">
              <Label>Tipo de proyecto</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(String(v ?? "client"))}
                items={PROJECT_KINDS.map((k) => ({
                  value: k,
                  label: projectKindLabels[k],
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {projectKindLabels[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isOwn
                  ? "Proyecto propio: lo trabajás vos. No pedimos cliente ni monto a cobrar."
                  : `Proyecto de cliente: pedimos ${vocab.companySingular} y monto.`}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!isOwn ? (
              <div className="space-y-2">
                <Label>{companyLabel}</Label>
                <Select
                  name="companyId"
                  defaultValue={opportunity?.companyId ?? defaultCompanyId ?? ""}
                  items={[
                    { value: "", label: `Sin ${vocab.companySingular}` },
                    ...companies.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      Sin {vocab.companySingular}
                    </SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                name="stage"
                defaultValue={opportunity?.stage ?? defaultStageKeyOf(stages)}
                items={stages.map((s) => ({
                  value: s.key,
                  label: s.label,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
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
            {vocab.hasValue ? (
              // Un proyecto propio no tiene monto a cobrar: se omite.
              isOwn ? null : (
                <div className="space-y-2">
                  <Label htmlFor="value">{vocab.valueLabel}</Label>
                  <Input
                    id="value"
                    name="value"
                    inputMode="decimal"
                    defaultValue={opportunity?.value?.toString() ?? ""}
                    placeholder={vocab.valuePlaceholder}
                  />
                </div>
              )
            ) : (
              <div className="space-y-2">
                <Label htmlFor="salaryRange">{vocab.valueLabel}</Label>
                <Input
                  id="salaryRange"
                  name="salaryRange"
                  defaultValue={opportunity?.salaryRange ?? ""}
                  placeholder={vocab.valuePlaceholder}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="url">
                {isOwn
                  ? "Link del proyecto"
                  : vocab.usesCv
                    ? "Link del aviso"
                    : "Link"}
              </Label>
              <Input
                id="url"
                name="url"
                type="text"
                inputMode="url"
                defaultValue={opportunity?.url ?? ""}
                placeholder={
                  isOwn
                    ? "repo, sitio, documento..."
                    : vocab.usesCv
                      ? "linkedin.com/jobs/..."
                      : "sitio o propuesta..."
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appliedAt">
                {isOwn ? "Fecha de inicio" : vocab.firstDateLabel}
              </Label>
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
                type="datetime-local"
                defaultValue={toDateTimeInputValue(opportunity?.nextFollowUpAt)}
              />
            </div>
          </div>
          {vocab.usesCv ? (
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
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="jobDescription">
              {isOwn ? "Objetivo y alcance" : vocab.descriptionLabel}
            </Label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              rows={4}
              defaultValue={opportunity?.jobDescription ?? ""}
              placeholder={
                isOwn
                  ? "Qué querés lograr, entregables propios, hitos, plazos..."
                  : vocab.descriptionPlaceholder
              }
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
