import { PageHeader } from "@/components/page-header";
import { AgentTeam } from "@/components/asistente/agent-team";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab } from "@/lib/tracks";

export const dynamic = "force-dynamic";

export default async function AsistentePage() {
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);

  return (
    <div>
      <PageHeader
        title="Asistente IA"
        description={`Tu equipo de agentes para mover el embudo de ${vocab.name.toLowerCase()}.`}
      />
      <AgentTeam />
    </div>
  );
}
