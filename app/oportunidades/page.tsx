import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/oportunidades/kanban";
import { OpportunityDialog } from "@/components/oportunidades/opportunity-dialog";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  const [opportunities, companies, cvVersions] = await Promise.all([
    prisma.opportunity.findMany({
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        stage: true,
        priority: true,
        nextFollowUpAt: true,
        company: { select: { id: true, name: true } },
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

  return (
    <div>
      <PageHeader
        title="Oportunidades"
        description="Tu embudo de búsqueda: arrastrá las cards para moverlas de etapa."
      >
        <OpportunityDialog
          companies={companies}
          cvVersions={cvVersions}
          trigger={
            <Button>
              <Plus className="size-4" />
              Nueva oportunidad
            </Button>
          }
        />
      </PageHeader>
      <Kanban opportunities={opportunities} />
    </div>
  );
}
