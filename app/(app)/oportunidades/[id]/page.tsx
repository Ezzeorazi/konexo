import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  MessageSquarePlus,
  HeartHandshake,
  Plus,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { deleteOpportunity } from "@/app/(app)/oportunidades/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  StageBadge,
  PriorityBadge,
  StrengthBadge,
  TouchpointTypeBadge,
} from "@/components/badges";
import { OpportunityDialog } from "@/components/oportunidades/opportunity-dialog";
import { CvTailorCard } from "@/components/oportunidades/cv-tailor-card";
import { ProjectTracker } from "@/components/oportunidades/project-tracker";
import { TouchpointDialog } from "@/components/contactos/touchpoint-dialog";
import { ContactDialog } from "@/components/contactos/contact-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDate, formatRelative } from "@/lib/dates";
import { getVocab, type Track } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";
import type { RelationshipStrength } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const strengthOrder: Record<RelationshipStrength, number> = {
  STRONG: 0,
  WARM: 1,
  COLD: 2,
};

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

  const facts: [string, React.ReactNode][] = [
    [
      "Etapa",
      <StageBadge key="s" stage={opportunity.stage} track={track} stages={stages} />,
    ],
    ["Prioridad", <PriorityBadge key="p" priority={opportunity.priority} />],
    ["Ubicación", opportunity.location ?? "—"],
    vocab.hasValue
      ? [
          vocab.valueLabel,
          opportunity.value != null
            ? opportunity.value.toLocaleString("es-AR")
            : "—",
        ]
      : [vocab.valueLabel, opportunity.salaryRange ?? "—"],
    [
      vocab.firstDateLabel,
      opportunity.appliedAt ? formatDate(opportunity.appliedAt) : "—",
    ],
    [
      "Próximo follow-up",
      opportunity.nextFollowUpAt
        ? formatDate(opportunity.nextFollowUpAt)
        : "—",
    ],
    ...(vocab.usesCv
      ? ([
          [
            "Versión de CV",
            opportunity.cvVersion ? (
              <span key="cv" className="inline-flex items-center gap-1">
                <FileText className="size-3.5 text-muted-foreground" />
                {opportunity.cvVersion.label}
              </span>
            ) : (
              "—"
            ),
          ],
        ] as [string, React.ReactNode][])
      : []),
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
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl tracking-wide text-ink md:text-4xl">
                {opportunity.title}
              </h1>
              <StageBadge
                stage={opportunity.stage}
                track={track}
                stages={stages}
              />
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
            <OpportunityDialog
              opportunity={opportunity}
              companies={companies}
              cvVersions={cvVersions}
              track={track}
              stages={stages}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" />
                  Editar
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {facts.map(([label, value]) => (
                <div
                  key={label as string}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right">{value}</span>
                </div>
              ))}
              {opportunity.notes ? (
                <div className="border-t pt-3">
                  <p className="mb-1 text-muted-foreground">Notas</p>
                  <p className="whitespace-pre-wrap">{opportunity.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {opportunity.jobDescription ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {vocab.descriptionLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {opportunity.jobDescription}
                </p>
              </CardContent>
            </Card>
          ) : null}

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
                Esta oportunidad no tiene empresa asignada. Asignale una desde
                “Editar” para ver quién de tu red puede ayudarte.
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
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Link
                          href={`/contactos/${contact.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {contact.name}
                        </Link>
                        {contact.role ? (
                          <p className="text-xs text-muted-foreground">
                            {contact.role}
                          </p>
                        ) : null}
                      </div>
                      <StrengthBadge
                        strength={contact.relationshipStrength}
                      />
                    </div>
                    <TouchpointDialog
                      contactId={contact.id}
                      opportunityId={opportunity.id}
                      defaultType="REFERRAL_ASK"
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
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
              <ol className="relative space-y-6 border-l pl-6">
                {opportunity.touchpoints.map((tp) => (
                  <li key={tp.id} className="relative">
                    <span className="absolute left-[-1.85rem] top-1.5 size-2.5 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <TouchpointTypeBadge type={tp.type} />
                      <span
                        className="text-xs text-muted-foreground"
                        title={formatDate(tp.occurredAt)}
                      >
                        {formatRelative(tp.occurredAt)}
                      </span>
                      {tp.contact ? (
                        <Link
                          href={`/contactos/${tp.contact.id}`}
                          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        >
                          con {tp.contact.name}
                        </Link>
                      ) : null}
                    </div>
                    {tp.note ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm">
                        {tp.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
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
