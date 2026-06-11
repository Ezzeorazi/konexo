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
import { deleteOpportunity } from "@/app/oportunidades/actions";
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
import { TouchpointDialog } from "@/components/contactos/touchpoint-dialog";
import { ContactDialog } from "@/components/contactos/contact-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDate, formatRelative } from "@/lib/dates";
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
  const [opportunity, companies, cvVersions] = await Promise.all([
    prisma.opportunity.findUnique({
      where: { id },
      include: {
        company: { include: { contacts: true } },
        cvVersion: true,
        touchpoints: {
          orderBy: { occurredAt: "desc" },
          include: { contact: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.cVVersion.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true },
    }),
  ]);

  if (!opportunity) notFound();

  const companyContacts = [...(opportunity.company?.contacts ?? [])].sort(
    (a, b) =>
      strengthOrder[a.relationshipStrength] -
      strengthOrder[b.relationshipStrength]
  );

  const facts: [string, React.ReactNode][] = [
    ["Etapa", <StageBadge key="s" stage={opportunity.stage} />],
    ["Prioridad", <PriorityBadge key="p" priority={opportunity.priority} />],
    ["Ubicación", opportunity.location ?? "—"],
    ["Rango salarial", opportunity.salaryRange ?? "—"],
    [
      "Aplicada el",
      opportunity.appliedAt ? formatDate(opportunity.appliedAt) : "—",
    ],
    [
      "Próximo follow-up",
      opportunity.nextFollowUpAt
        ? formatDate(opportunity.nextFollowUpAt)
        : "—",
    ],
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/oportunidades"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Oportunidades
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {opportunity.title}
              </h1>
              <StageBadge stage={opportunity.stage} />
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
                  Descripción del puesto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {opportunity.jobDescription}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit border-primary/30 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartHandshake className="size-4 text-primary" />
              ¿Quién puede referirte acá?
            </CardTitle>
            <CardDescription>
              Un referido multiplica tus chances. Estos son tus contactos en
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
    </div>
  );
}
