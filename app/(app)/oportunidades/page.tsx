import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/oportunidades/kanban";
import { SalesBoard } from "@/components/oportunidades/sales-board";
import { OpportunityDialog } from "@/components/oportunidades/opportunity-dialog";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab, trackUsesVentures } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  const userId = await currentUserId();
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);
  const stages = await getTrackStages(track);

  const usesVentures = trackUsesVentures(track);
  const [opportunities, companies, cvVersions, ventures] = await Promise.all([
    prisma.opportunity.findMany({
      where: { userId, track },
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        stage: true,
        priority: true,
        nextFollowUpAt: true,
        kind: true,
        accentColor: true,
        accentEmoji: true,
        company: { select: { id: true, name: true } },
        venture: {
          select: { id: true, name: true, color: true, emoji: true },
        },
      },
    }),
    prisma.company.findMany({
      where: { userId, track },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.cVVersion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true },
    }),
    usesVentures
      ? prisma.venture.findMany({
          where: { userId },
          orderBy: { name: "asc" },
          select: { id: true, name: true, color: true, emoji: true },
        })
      : Promise.resolve(
          [] as { id: string; name: string; color: string | null; emoji: string | null }[]
        ),
  ]);

  return (
    <div>
      <PageHeader title={vocab.oppPlural} description={vocab.boardDescription}>
        <OpportunityDialog
          companies={companies}
          cvVersions={cvVersions}
          ventures={ventures}
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
      {usesVentures ? (
        <SalesBoard
          opportunities={opportunities}
          ventures={ventures}
          stages={stages}
        />
      ) : (
        <Kanban opportunities={opportunities} stages={stages} />
      )}
    </div>
  );
}
