import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      include: { company: true },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Contactos"
        description="Tu red: las personas que pueden abrirte puertas."
      >
        <ContactDialog
          companies={companies}
          trigger={
            <Button>
              <Plus className="size-4" />
              Nuevo contacto
            </Button>
          }
        />
      </PageHeader>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no cargaste contactos. Tu red es tu mejor canal: empezá por
            la gente que ya conocés.
          </p>
          <ContactDialog
            companies={companies}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="size-4" />
                Crear el primero
              </Button>
            }
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-background">
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
                <TableRow key={contact.id}>
                  <TableCell>
                    <Link
                      href={`/contactos/${contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {contact.role ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {contact.company ? (
                      <Link
                        href={`/empresas/${contact.company.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        {contact.company.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StrengthBadge strength={contact.relationshipStrength} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {contact.nextFollowUpAt
                      ? formatDate(contact.nextFollowUpAt)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
