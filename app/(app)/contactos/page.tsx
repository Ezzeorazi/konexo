import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StrengthBadge } from "@/components/badges";
import { ContactDialog } from "@/components/contactos/contact-dialog";
import { RowLink } from "@/components/clickable";
import { formatDateTime } from "@/lib/dates";
import { getActiveTrack } from "@/lib/active-track";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const userId = await currentUserId();
  const { track } = await getActiveTrack();
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: { userId, track },
      orderBy: { name: "asc" },
      include: { company: true },
    }),
    prisma.company.findMany({
      where: { userId, track },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Contactos"
        description={
          track === "jobs"
            ? "Tu red: las personas que pueden abrirte puertas."
            : "Tu red: las personas que te acercan al cierre."
        }
      >
        <ContactDialog
          companies={companies}
          track={track}
          trigger={
            <Button>
              <Plus className="size-4" />
              Nuevo contacto
            </Button>
          }
        />
      </PageHeader>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border-[3px] border-dashed border-ink bg-panelw py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no cargaste contactos. Tu red es tu mejor canal: empezá por
            la gente que ya conocés.
          </p>
          <ContactDialog
            companies={companies}
            track={track}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="size-4" />
                Crear el primero
              </Button>
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border-[3px] border-ink bg-panelw shadow-[5px_5px_0_var(--color-ink)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Rol</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead>Relación</TableHead>
                <TableHead className="hidden md:table-cell">
                  Próximo follow-up
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <RowLink key={contact.id} href={`/contactos/${contact.id}`}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {contact.role ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {contact.company ? contact.company.name : "—"}
                  </TableCell>
                  <TableCell>
                    <StrengthBadge strength={contact.relationshipStrength} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {contact.nextFollowUpAt
                      ? formatDateTime(contact.nextFollowUpAt)
                      : "—"}
                  </TableCell>
                </RowLink>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
