import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteCompany } from "@/app/empresas/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StageBadge, StrengthBadge } from "@/components/badges";
import { CompanyDialog } from "@/components/empresas/company-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export const dynamic = "force-dynamic";

export default async function EmpresaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      opportunities: { orderBy: { updatedAt: "desc" } },
      contacts: { orderBy: { name: "asc" } },
    },
  });

  if (!company) notFound();

  const facts: [string, string | null][] = [
    ["Industria", company.industry],
    ["Ubicación", company.location],
    ["Fuente", company.source],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/empresas"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Empresas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {company.name}
            </h1>
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
            <CompanyDialog
              company={company}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" />
                  Editar
                </Button>
              }
            />
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right">{value ?? "—"}</span>
              </div>
            ))}
            {company.notes ? (
              <div className="border-t pt-3">
                <p className="mb-1 text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap">{company.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Oportunidades ({company.opportunities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin oportunidades en esta empresa todavía.
              </p>
            ) : (
              <ul className="space-y-3">
                {company.opportunities.map((opp) => (
                  <li
                    key={opp.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/oportunidades/${opp.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {opp.title}
                    </Link>
                    <StageBadge stage={opp.stage} />
                  </li>
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
              <ul className="space-y-3">
                {company.contacts.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex items-center justify-between gap-2"
                  >
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
                    <StrengthBadge strength={contact.relationshipStrength} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
