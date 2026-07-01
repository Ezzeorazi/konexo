import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import {
  deleteCompany,
  patchCompanyField,
} from "@/app/(app)/empresas/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StageBadge, StrengthBadge } from "@/components/badges";
import { ItemLink } from "@/components/clickable";
import { EditableText } from "@/components/editable/editable-text";
import { EditableMarkdown } from "@/components/editable/editable-markdown";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { getVocab, type Track } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";

export const dynamic = "force-dynamic";

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

export default async function EmpresaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  const company = await prisma.company.findFirst({
    where: { id, userId },
    include: {
      opportunities: { orderBy: { updatedAt: "desc" } },
      contacts: { orderBy: { name: "asc" } },
    },
  });

  if (!company) notFound();

  const track = (company.track as Track) ?? "jobs";
  const vocab = getVocab(track);
  const stages = await getTrackStages(track);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/empresas"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {vocab.companyPlural}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <EditableText
              value={company.name}
              required
              ariaLabel="Editar nombre"
              onSave={patchCompanyField.bind(null, company.id, "name")}
              className="font-display text-3xl tracking-wide text-ink md:text-4xl"
              inputClassName="font-display text-3xl tracking-wide text-ink md:text-4xl"
            />
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                {company.website}
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ConfirmDeleteButton
              action={deleteCompany.bind(null, company.id)}
              title="¿Eliminar esta empresa?"
              description="Las oportunidades y contactos vinculados no se borran, pero quedan sin empresa."
              successMessage="Empresa eliminada."
              redirectTo="/empresas"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
            <CardDescription>
              Hacé clic en cualquier valor para editarlo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FieldRow label="Industria">
              <EditableText
                value={company.industry ?? ""}
                placeholder="Ej.: Impresiones 3D"
                ariaLabel="Editar industria"
                onSave={patchCompanyField.bind(null, company.id, "industry")}
              />
            </FieldRow>
            <FieldRow label="Ubicación">
              <EditableText
                value={company.location ?? ""}
                placeholder="Ej.: Remoto"
                ariaLabel="Editar ubicación"
                onSave={patchCompanyField.bind(null, company.id, "location")}
              />
            </FieldRow>
            <FieldRow label="Sitio web">
              <EditableText
                value={company.website ?? ""}
                type="url"
                inputMode="url"
                placeholder="empresa.com"
                ariaLabel="Editar sitio web"
                onSave={patchCompanyField.bind(null, company.id, "website")}
              />
            </FieldRow>
            <FieldRow label="Fuente">
              <EditableText
                value={company.source ?? ""}
                placeholder="¿De dónde salió?"
                ariaLabel="Editar fuente"
                onSave={patchCompanyField.bind(null, company.id, "source")}
              />
            </FieldRow>
            <div className="border-t pt-3">
              <p className="mb-1 text-muted-foreground">Notas</p>
              <EditableMarkdown
                value={company.notes ?? ""}
                ariaLabel="Editar notas"
                placeholder="Contexto, relación comercial, lo que sea… (Markdown)"
                onSave={patchCompanyField.bind(null, company.id, "notes")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {vocab.oppPlural} ({company.opportunities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {`Sin ${vocab.oppPlural.toLowerCase()} en ${
                  vocab.companySingular === "cliente" ? "este" : "esta"
                } ${vocab.companySingular} todavía.`}
              </p>
            ) : (
              <ul className="space-y-1">
                {company.opportunities.map((opp) => (
                  <ItemLink key={opp.id} href={`/oportunidades/${opp.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{opp.title}</span>
                      <StageBadge
                        stage={opp.stage}
                        track={track}
                        stages={stages}
                      />
                    </div>
                  </ItemLink>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contactos ({company.contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin contactos en esta empresa todavía. ¿Conocés a alguien que
                trabaje acá?
              </p>
            ) : (
              <ul className="space-y-1">
                {company.contacts.map((contact) => (
                  <ItemLink key={contact.id} href={`/contactos/${contact.id}`}>
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
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
