import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
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
import { CompanyDialog } from "@/components/empresas/company-dialog";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { opportunities: true, contacts: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Empresas"
        description="Las empresas detrás de tus oportunidades y contactos."
      >
        <CompanyDialog
          trigger={
            <Button>
              <Plus className="size-4" />
              Nueva empresa
            </Button>
          }
        />
      </PageHeader>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background py-16 text-center">
          <Building2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no cargaste ninguna empresa.
          </p>
          <CompanyDialog
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="size-4" />
                Crear la primera
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
                <TableHead className="hidden md:table-cell">
                  Industria
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Ubicación
                </TableHead>
                <TableHead className="text-right">Oportunidades</TableHead>
                <TableHead className="text-right">Contactos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <Link
                      href={`/empresas/${company.id}`}
                      className="font-medium hover:underline"
                    >
                      {company.name}
                    </Link>
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
