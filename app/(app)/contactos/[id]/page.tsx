import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import {
  deleteContact,
  patchContactField,
} from "@/app/(app)/contactos/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StrengthBadge, TouchpointTypeBadge } from "@/components/badges";
import { ContactStrengthSelect } from "@/components/contactos/inline-editors";
import { EditableText } from "@/components/editable/editable-text";
import { EditableSelect } from "@/components/editable/editable-select";
import { EditableMarkdown } from "@/components/editable/editable-markdown";
import { TouchpointDialog } from "@/components/contactos/touchpoint-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  toDateInputValue,
  toDateTimeInputValue,
} from "@/lib/dates";

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

export default async function ContactoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  const contact = await prisma.contact.findFirst({
    where: { id, userId },
    include: {
      company: true,
      touchpoints: {
        orderBy: { occurredAt: "desc" },
        include: { opportunity: { select: { id: true, title: true } } },
      },
    },
  });

  if (!contact) notFound();

  // Empresas y oportunidades del mismo track del contacto: no se cruzan modos.
  const [companies, opportunities] = await Promise.all([
    prisma.company.findMany({
      where: { userId, track: contact.track },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.opportunity.findMany({
      where: { userId, track: contact.track },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  const companyOptions = [
    { value: "", label: "Sin empresa" },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];

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
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <EditableText
                value={contact.name}
                required
                ariaLabel="Editar nombre"
                onSave={patchContactField.bind(null, contact.id, "name")}
                className="font-display text-3xl tracking-wide text-ink md:text-4xl"
                inputClassName="font-display text-3xl tracking-wide text-ink md:text-4xl"
              />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
            <CardDescription>
              Hacé clic en cualquier valor para editarlo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FieldRow label="Rol">
              <EditableText
                value={contact.role ?? ""}
                placeholder="Ej.: Engineering Manager"
                ariaLabel="Editar rol"
                onSave={patchContactField.bind(null, contact.id, "role")}
              />
            </FieldRow>
            <FieldRow label="Empresa">
              <EditableSelect
                value={contact.companyId ?? ""}
                ariaLabel="Cambiar empresa"
                placeholder="Sin empresa"
                options={companyOptions}
                onSave={patchContactField.bind(null, contact.id, "companyId")}
              />
            </FieldRow>
            <FieldRow label="Relación">
              <ContactStrengthSelect
                id={contact.id}
                value={contact.relationshipStrength}
              />
            </FieldRow>
            <FieldRow label="Email">
              <EditableText
                value={contact.email ?? ""}
                type="email"
                placeholder="nombre@empresa.com"
                ariaLabel="Editar email"
                onSave={patchContactField.bind(null, contact.id, "email")}
              />
            </FieldRow>
            <FieldRow label="Teléfono">
              <EditableText
                value={contact.phone ?? ""}
                placeholder="Sin teléfono"
                ariaLabel="Editar teléfono"
                onSave={patchContactField.bind(null, contact.id, "phone")}
              />
            </FieldRow>
            <FieldRow label="LinkedIn">
              <EditableText
                value={contact.linkedinUrl ?? ""}
                type="url"
                inputMode="url"
                placeholder="linkedin.com/in/…"
                ariaLabel="Editar LinkedIn"
                onSave={patchContactField.bind(null, contact.id, "linkedinUrl")}
              />
            </FieldRow>
            <div className="border-t pt-3">
              <FieldRow label="Próximo follow-up">
                <EditableText
                  value={toDateTimeInputValue(contact.nextFollowUpAt)}
                  display={
                    contact.nextFollowUpAt
                      ? formatDateTime(contact.nextFollowUpAt)
                      : undefined
                  }
                  type="datetime-local"
                  ariaLabel="Editar próximo follow-up"
                  onSave={patchContactField.bind(
                    null,
                    contact.id,
                    "nextFollowUpAt"
                  )}
                />
              </FieldRow>
            </div>
            <div className="border-t pt-3">
              <p className="mb-1 text-muted-foreground">Notas</p>
              <EditableMarkdown
                value={contact.notes ?? ""}
                ariaLabel="Editar notas"
                placeholder="Cómo se conocieron, contexto, favores pendientes… (Markdown)"
                onSave={patchContactField.bind(null, contact.id, "notes")}
              />
            </div>
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
