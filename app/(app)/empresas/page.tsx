import { Plus, Building2 } from "lucide-react";
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
import { CompanyDialog } from "@/components/empresas/company-dialog";
import { RowLink } from "@/components/clickable";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab } from "@/lib/tracks";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const userId = await currentUserId();
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);
  const singular = vocab.companySingular;

  const companies = await prisma.company.findMany({
    where: { userId, track },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { opportunities: true, contacts: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title={vocab.companyPlural}
        description={`Los registros de ${vocab.companyPlural.toLowerCase()} detrás de tus ${vocab.oppPlural.toLowerCase()} y contactos.`}
      >
        <CompanyDialog
          track={track}
          trigger={
            <Button>
              <Plus className="size-4" />
              {`Nueva ${singular}`}
            </Button>
          }
        />
      </PageHeader>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border-[3px] border-dashed border-ink bg-panelw py-16 text-center">
          <Building2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {`Todavía no cargaste ninguna ${singular}.`}
          </p>
          <CompanyDialog
            track={track}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="size-4" />
                Crear la primera
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
                <TableHead className="hidden md:table-cell">
                  Industria
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Ubicación
                </TableHead>
                <TableHead className="text-right">{vocab.oppPlural}</TableHead>
                <TableHead className="text-right">Contactos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <RowLink key={company.id} href={`/empresas/${company.id}`}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {company.industry ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {company.location ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {company._count.opportunities}
                  </TableCell>
                  <TableCell className="text-right">
                    {company._count.contacts}
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
