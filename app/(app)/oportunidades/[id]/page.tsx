import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MessageSquarePlus,
  HeartHandshake,
  Plus,
  FileText,
  CalendarClock,
  CalendarPlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import {
  deleteOpportunity,
  patchOpportunityField,
} from "@/app/(app)/oportunidades/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StageBadge, StrengthBadge } from "@/components/badges";
import {
  OppStageSelect,
  OppPrioritySelect,
} from "@/components/oportunidades/inline-editors";
import { EditableText } from "@/components/editable/editable-text";
import { EditableSelect } from "@/components/editable/editable-select";
import { EditableMarkdown } from "@/components/editable/editable-markdown";
import { ItemLink } from "@/components/clickable";
import { CvTailorCard } from "@/components/oportunidades/cv-tailor-card";
import { ProjectTracker } from "@/components/oportunidades/project-tracker";
import { TouchpointDialog } from "@/components/contactos/touchpoint-dialog";
import { TouchpointTimeline } from "@/components/contactos/touchpoint-timeline";
import { ContactDialog } from "@/components/contactos/contact-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CatchMeUpButton } from "@/components/oportunidades/catch-me-up";
import {
  formatDate,
  formatDateTime,
  formatOverdue,
  formatRelative,
  toDateInputValue,
  toDateTimeInputValue,
} from "@/lib/dates";
import { PROJECT_KINDS, projectKindLabels } from "@/lib/labels";
import { getVocab, type Track } from "@/lib/tracks";
import { getOwnAccent } from "@/lib/appearance";
import { OwnProjectAppearance } from "@/components/oportunidades/own-appearance";
import { getTrackStages } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { RelationshipStrength } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const strengthOrder: Record<RelationshipStrength, number> = {
  STRONG: 0,
  WARM: 1,
  COLD: 2,
};

// Fila etiqueta/control de la card "Datos".
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export default async function OportunidadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  const opportunity = await prisma.opportunity.findFirst({
    where: { id, userId },
    include: {
      company: { include: { contacts: true } },
      cvVersion: true,
      touchpoints: {
        orderBy: { occurredAt: "desc" },
        include: { contact: { select: { id: true, name: true } } },
      },
      projectNotes: { orderBy: { createdAt: "desc" } },
      projectTasks: { orderBy: [{ done: "asc" }, { order: "asc" }] },
    },
  });

  if (!opportunity) notFound();

  const track = (opportunity.track as Track) ?? "jobs";
  const vocab = getVocab(track);
  const isOwn = vocab.hasDelivery && opportunity.kind === "own";
  const accent = getOwnAccent(opportunity.accentColor);
  // Empresas filtradas por el track de la oportunidad: no se cruzan modos.
  const [companies, cvVersions, stages] = await Promise.all([
    prisma.company.findMany({
      where: { userId, track },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.cVVersion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true },
    }),
    getTrackStages(track),
  ]);

  const companyContacts = [...(opportunity.company?.contacts ?? [])].sort(
    (a, b) =>
      strengthOrder[a.relationshipStrength] -
      strengthOrder[b.relationshipStrength]
  );

  const companyOptions = [
    { value: "", label: "Sin empresa" },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];
  const cvOptions = [
    { value: "", label: "Sin versión de CV" },
    ...cvVersions.map((cv) => ({ value: cv.id, label: cv.label })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/oportunidades"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {vocab.oppPlural}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <EditableText
                value={opportunity.title}
                required
                ariaLabel="Editar título"
                onSave={patchOpportunityField.bind(null, opportunity.id, "title")}
                className="font-display text-3xl tracking-wide text-ink md:text-4xl"
                inputClassName="font-display text-3xl tracking-wide text-ink md:text-4xl"
              />
              <StageBadge stage={opportunity.stage} track={track} stages={stages} />
              {isOwn ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border-2 border-ink px-2 py-0.5 font-display text-xs tracking-wide shadow-[2px_2px_0_var(--color-ink)]",
                    accent.badge
                  )}
                >
                  {opportunity.accentEmoji ? (
                    <span className="text-sm leading-none">
                      {opportunity.accentEmoji}
                    </span>
                  ) : null}
                  PROPIO
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {opportunity.company ? (
                <Link
                  href={`/empresas/${opportunity.company.id}`}
                  className="hover:underline"
                >
                  {opportunity.company.name}
                </Link>
              ) : (
                <span>Sin empresa asignada</span>
              )}
              {opportunity.url ? (
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  Ver aviso
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vocab.hasDelivery ? (
              <CatchMeUpButton opportunityId={opportunity.id} />
            ) : null}
            <TouchpointDialog
              opportunityId={opportunity.id}
              contacts={companyContacts.map((c) => ({
                id: c.id,
                name: c.name,
              }))}
              trigger={
                <Button variant="outline" size="sm">
                  <MessageSquarePlus className="size-4" />
                  Registrar touchpoint
                </Button>
              }
            />
            <ConfirmDeleteButton
              action={deleteOpportunity.bind(null, opportunity.id)}
              title="¿Eliminar esta oportunidad?"
              description="Se pierde el historial de etapas y notas de esta búsqueda."
              successMessage="Oportunidad eliminada."
              redirectTo="/oportunidades"
            />
          </div>
        </div>
      </div>

      {/* Próxima reunión / follow-up: prominente y editable desde el proyecto. */}
      {(() => {
        const followUp = opportunity.nextFollowUpAt;
        const overdue = followUp ? followUp < new Date() : false;
        return (
          <Card
            className={cn(
              "border-[3px]",
              overdue ? "border-alarm bg-alarm/5" : "border-ink"
            )}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink",
                    overdue ? "bg-alarm text-paper" : "bg-komic text-ink"
                  )}
                >
                  <CalendarClock className="size-5" />
                </span>
                <div>
                  <p className="font-display text-[11px] tracking-[0.18em] text-muted-foreground">
                    PRÓXIMA REUNIÓN / FOLLOW-UP
                  </p>
                  <div className="text-lg font-medium">
                    <EditableText
                      value={toDateTimeInputValue(followUp)}
                      display={followUp ? formatDateTime(followUp) : undefined}
                      type="datetime-local"
                      placeholder="Sin agendar — hacé clic para elegir fecha y hora"
                      ariaLabel="Editar próxima reunión o follow-up"
                      onSave={patchOpportunityField.bind(
                        null,
                        opportunity.id,
                        "nextFollowUpAt"
                      )}
                    />
                  </div>
                  {followUp ? (
                    <p
                      className={cn(
                        "px-1.5 text-xs",
                        overdue
                          ? "font-medium text-alarm"
                          : "text-muted-foreground"
                      )}
                    >
                      {overdue
                        ? formatOverdue(followUp)
                        : formatRelative(followUp)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TouchpointDialog
                  opportunityId={opportunity.id}
                  defaultType="MEETING"
                  contacts={companyContacts.map((c) => ({
                    id: c.id,
                    name: c.name,
                  }))}
                  trigger={
                    <Button variant="outline" size="sm">
                      <CalendarPlus className="size-4" />
                      Registrar reunión
                    </Button>
                  }
                />
                <Link
                  href="/calendario"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Ver calendario
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos</CardTitle>
              <CardDescription>
                Hacé clic en cualquier valor para editarlo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <FieldRow label="Etapa">
                <OppStageSelect
                  id={opportunity.id}
                  value={opportunity.stage}
                  track={track}
                  stages={stages}
                />
              </FieldRow>
              <FieldRow label="Prioridad">
                <OppPrioritySelect
                  id={opportunity.id}
                  value={opportunity.priority}
                />
              </FieldRow>
              {vocab.hasDelivery ? (
                <FieldRow label="Tipo de proyecto">
                  <EditableSelect
                    value={opportunity.kind ?? "client"}
                    ariaLabel="Cambiar tipo de proyecto"
                    options={PROJECT_KINDS.map((k) => ({
                      value: k,
                      label: projectKindLabels[k],
                    }))}
                    onSave={patchOpportunityField.bind(
                      null,
                      opportunity.id,
                      "kind"
                    )}
                  />
                </FieldRow>
              ) : null}
              {isOwn ? (
                <FieldRow label="Apariencia">
                  <OwnProjectAppearance
                    opportunityId={opportunity.id}
                    accentColor={opportunity.accentColor}
                    accentEmoji={opportunity.accentEmoji}
                  />
                </FieldRow>
              ) : null}
              {!isOwn ? (
              <FieldRow label={vocab.hasDelivery ? vocab.companySingular : "Empresa"}>
                <EditableSelect
                  value={opportunity.companyId ?? ""}
                  ariaLabel="Cambiar empresa"
                  placeholder="Sin empresa"
                  options={companyOptions}
                  onSave={patchOpportunityField.bind(
                    null,
                    opportunity.id,
                    "companyId"
                  )}
                />
              </FieldRow>
              ) : null}
              <FieldRow label="Ubicación">
                <EditableText
                  value={opportunity.location ?? ""}
                  placeholder="Ej.: Remoto"
                  ariaLabel="Editar ubicación"
                  onSave={patchOpportunityField.bind(
                    null,
                    opportunity.id,
                    "location"
                  )}
                />
              </FieldRow>
              {vocab.hasValue ? (
                // Un proyecto propio no tiene monto a cobrar.
                isOwn ? null : (
                <FieldRow label={vocab.valueLabel}>
                  <EditableText
                    value={opportunity.value?.toString() ?? ""}
                    display={
                      opportunity.value != null
                        ? opportunity.value.toLocaleString("es-AR")
                        : undefined
                    }
                    type="number"
                    inputMode="decimal"
                    placeholder={vocab.valuePlaceholder}
                    ariaLabel={`Editar ${vocab.valueLabel}`}
                    onSave={patchOpportunityField.bind(
                      null,
                      opportunity.id,
                      "value"
                    )}
                  />
                </FieldRow>
                )
              ) : (
                <FieldRow label={vocab.valueLabel}>
                  <EditableText
                    value={opportunity.salaryRange ?? ""}
                    placeholder={vocab.valuePlaceholder}
                    ariaLabel={`Editar ${vocab.valueLabel}`}
                    onSave={patchOpportunityField.bind(
                      null,
                      opportunity.id,
                      "salaryRange"
                    )}
                  />
                </FieldRow>
              )}
              <FieldRow label="Link">
                <EditableText
                  value={opportunity.url ?? ""}
                  type="url"
                  inputMode="url"
                  placeholder={
                    vocab.usesCv ? "linkedin.com/jobs/…" : "sitio o propuesta…"
                  }
                  ariaLabel="Editar link"
                  onSave={patchOpportunityField.bind(
                    null,
                    opportunity.id,
                    "url"
                  )}
                />
              </FieldRow>
              <FieldRow label={vocab.firstDateLabel}>
                <EditableText
                  value={toDateInputValue(opportunity.appliedAt)}
                  display={
                    opportunity.appliedAt
                      ? formatDate(opportunity.appliedAt)
                      : undefined
                  }
                  type="date"
                  ariaLabel={`Editar ${vocab.firstDateLabel}`}
                  onSave={patchOpportunityField.bind(
                    null,
                    opportunity.id,
                    "appliedAt"
                  )}
                />
              </FieldRow>
              {vocab.usesCv ? (
                <FieldRow label="Versión de CV">
                  <span className="inline-flex items-center gap-1">
                    {opportunity.cvVersion ? (
                      <FileText className="size-3.5 text-muted-foreground" />
                    ) : null}
                    <EditableSelect
                      value={opportunity.cvVersionId ?? ""}
                      ariaLabel="Cambiar versión de CV"
                      placeholder="Sin versión de CV"
                      options={cvOptions}
                      onSave={patchOpportunityField.bind(
                        null,
                        opportunity.id,
                        "cvVersionId"
                      )}
                    />
                  </span>
                </FieldRow>
              ) : null}

              <div className="border-t pt-3">
                <p className="mb-1 text-muted-foreground">Notas</p>
                <EditableMarkdown
                  value={opportunity.notes ?? ""}
                  ariaLabel="Editar notas"
                  placeholder="Estado del proceso, impresiones, pendientes… (Markdown)"
                  onSave={patchOpportunityField.bind(
                    null,
                    opportunity.id,
                    "notes"
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{vocab.descriptionLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <EditableMarkdown
                value={opportunity.jobDescription ?? ""}
                ariaLabel={`Editar ${vocab.descriptionLabel}`}
                placeholder={vocab.descriptionPlaceholder}
                onSave={patchOpportunityField.bind(
                  null,
                  opportunity.id,
                  "jobDescription"
                )}
              />
            </CardContent>
          </Card>

          {vocab.usesCv ? (
            <CvTailorCard
              opportunityId={opportunity.id}
              hasJobDescription={Boolean(opportunity.jobDescription?.trim())}
              hasCvContent={Boolean(opportunity.cvVersion?.content?.trim())}
              cvLabel={opportunity.cvVersion?.label ?? null}
            />
          ) : null}
        </div>

        <Card className="h-fit border-primary/30 bg-primary/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartHandshake className="size-4 text-primary" />
              {vocab.decisionTitle}
            </CardTitle>
            <CardDescription>
              {vocab.decisionHint}
              {opportunity.company ? ` ${opportunity.company.name}` : " la empresa"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!opportunity.company ? (
              <p className="text-sm text-muted-foreground">
                Esta oportunidad no tiene empresa asignada. Asignale una desde la
                card “Datos” para ver quién de tu red puede ayudarte.
              </p>
            ) : companyContacts.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Todavía no tenés contactos en {opportunity.company.name}.
                  ¿Conocés a alguien que trabaje ahí o que pueda presentarte?
                </p>
                <ContactDialog
                  companies={companies}
                  defaultCompanyId={opportunity.company.id}
                  track={track}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="size-4" />
                      Agregar contacto
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="space-y-4">
                {companyContacts.map((contact) => (
                  <li key={contact.id} className="space-y-1.5">
                    <ItemLink href={`/contactos/${contact.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-medium">
                            {contact.name}
                          </span>
                          {contact.role ? (
                            <p className="text-xs text-muted-foreground">
                              {contact.role}
                            </p>
                          ) : null}
                        </div>
                        <StrengthBadge strength={contact.relationshipStrength} />
                      </div>
                    </ItemLink>
                    <TouchpointDialog
                      contactId={contact.id}
                      opportunityId={opportunity.id}
                      defaultType="REFERRAL_ASK"
                      trigger={
                        <Button variant="outline" size="sm" className="w-full">
                          <HeartHandshake className="size-3.5" />
                          Pedir referido
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">
              Timeline ({opportunity.touchpoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunity.touchpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin interacciones registradas para esta oportunidad.
              </p>
            ) : (
              <TouchpointTimeline
                items={opportunity.touchpoints.map((tp) => ({
                  id: tp.id,
                  type: tp.type,
                  note: tp.note,
                  occurredAt: tp.occurredAt,
                  link: tp.contact
                    ? {
                        href: `/contactos/${tp.contact.id}`,
                        label: `con ${tp.contact.name}`,
                      }
                    : null,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {vocab.hasDelivery ? (
        <ProjectTracker
          opportunityId={opportunity.id}
          tasks={opportunity.projectTasks.map((t) => ({
            id: t.id,
            title: t.title,
            done: t.done,
          }))}
          notes={opportunity.projectNotes.map((n) => ({
            id: n.id,
            kind: n.kind,
            body: n.body,
            createdAt: n.createdAt,
          }))}
        />
      ) : null}
    </div>
  );
}
