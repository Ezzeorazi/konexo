import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  MessageSquarePlus,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteContact } from "@/app/contactos/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StrengthBadge, TouchpointTypeBadge } from "@/components/badges";
import { ContactDialog } from "@/components/contactos/contact-dialog";
import { TouchpointDialog } from "@/components/contactos/touchpoint-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDate, formatRelative } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ContactoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, companies, opportunities] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        touchpoints: {
          orderBy: { occurredAt: "desc" },
          include: { opportunity: { select: { id: true, title: true } } },
        },
      },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.opportunity.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  if (!contact) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/contactos"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Contactos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {contact.name}
              </h1>
              <StrengthBadge strength={contact.relationshipStrength} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[contact.role, contact.company?.name]
                .filter(Boolean)
                .join(" · ") || "Sin rol ni empresa asignados"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TouchpointDialog
              contactId={contact.id}
              opportunities={opportunities}
              trigger={
                <Button>
                  <MessageSquarePlus className="size-4" />
                  Registrar touchpoint
                </Button>
              }
            />
            <ContactDialog
              contact={contact}
              companies={companies}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" />
                  Editar
                </Button>
              }
            />
            <ConfirmDeleteButton
              action={deleteContact.bind(null, contact.id)}
              title="¿Eliminar este contacto?"
              description="Se borran también sus touchpoints. Esta acción no se puede deshacer."
              successMessage="Contacto eliminado."
              redirectTo="/contactos"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contact.email ? (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </div>
            ) : null}
            {contact.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            ) : null}
            {contact.linkedinUrl ? (
              <div className="flex items-center gap-2">
                <ExternalLink className="size-4 text-muted-foreground" />
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Perfil de LinkedIn
                </a>
              </div>
            ) : null}
            {!contact.email && !contact.phone && !contact.linkedinUrl ? (
              <p className="text-muted-foreground">
                Sin datos de contacto cargados.
              </p>
            ) : null}
            <div className="border-t pt-3">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Próximo follow-up
                </span>
                <span>
                  {contact.nextFollowUpAt
                    ? formatDate(contact.nextFollowUpAt)
                    : "—"}
                </span>
              </div>
            </div>
            {contact.notes ? (
              <div className="border-t pt-3">
                <p className="mb-1 text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap">{contact.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Timeline ({contact.touchpoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contact.touchpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin interacciones registradas. Registrá el primer touchpoint
                para empezar a construir historia con {contact.name}.
              </p>
            ) : (
              <ol className="relative space-y-6 border-l pl-6">
                {contact.touchpoints.map((tp) => (
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
                      {tp.opportunity ? (
                        <Link
                          href={`/oportunidades/${tp.opportunity.id}`}
                          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        >
                          → {tp.opportunity.title}
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
