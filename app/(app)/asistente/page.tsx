import { PageHeader } from "@/components/page-header";
import { AgentTeam } from "@/components/asistente/agent-team";
import { getActiveTrack, getBusinessName } from "@/lib/active-track";
import { getVocab, withBusinessName } from "@/lib/tracks";

export const dynamic = "force-dynamic";

export default async function AsistentePage() {
  const [{ track }, businessName] = await Promise.all([
    getActiveTrack(),
    getBusinessName(),
  ]);
  const vocab = withBusinessName(getVocab(track), businessName);

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
