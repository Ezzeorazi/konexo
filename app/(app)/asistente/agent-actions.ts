"use server";

import { gatherPipeline } from "./pipeline";
import { runAgentTeam, type AgentTeamResult } from "@/lib/agent-team";

/**
 * Pone a trabajar al equipo de agentes sobre el embudo del track activo.
 * Todo el trabajo concurrente (calificar + redactar en paralelo) ocurre dentro
 * de esta única Server Function, como recomienda Next para concurrencia server.
 */
export async function runAgents(): Promise<AgentTeamResult> {
  const data = await gatherPipeline();
  return runAgentTeam(data);
}
