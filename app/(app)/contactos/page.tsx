import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/contactos/contact-dialog";
import {
  ContactsTable,
  type ContactRow,
} from "@/components/contactos/contacts-table";
import { getActiveTrack } from "@/lib/active-track";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const userId = await currentUserId();
  const { track } = await getActiveTrack();
  // Directorio COMPARTIDO: traemos los contactos de todos los modos (no solo el
  // activo). El alta, en cambio, se crea en el modo activo (con sus empresas).
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { company: { select: { name: true } } },
    }),
    prisma.company.findMany({
      where: { userId, track },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: ContactRow[] = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    companyName: c.company?.name ?? null,
    strength: c.relationshipStrength,
    nextFollowUpAt: c.nextFollowUpAt,
    track: c.track,
  }));

  return (
    <div>
      <PageHeader
        title="Contactos"
        description="Tu red completa, de todos los modos. Filtrá por modo con los chips."
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
        <ContactsTable contacts={rows} />
      )}
    </div>
  );
}
