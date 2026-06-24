import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/oportunidades/kanban";
import { OpportunityDialog } from "@/components/oportunidades/opportunity-dialog";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);
  const stages = await getTrackStages(track);

  const [opportunities, companies, cvVersions] = await Promise.all([
    prisma.opportunity.findMany({
      where: { track },
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
      where: { track },
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
      <PageHeader title={vocab.oppPlural} description={vocab.boardDescription}>
        <OpportunityDialog
          companies={companies}
          cvVersions={cvVersions}
          track={track}
          stages={stages}
          trigger={
            <Button>
              <Plus className="size-4" />
              {vocab.newOpp}
            </Button>
          }
        />
      </PageHeader>
      <Kanban opportunities={opportunities} stages={stages} />
    </div>
  );
}
