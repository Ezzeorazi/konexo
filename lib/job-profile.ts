import { getSettingsMap } from "@/lib/settings";
import { JOB_PROFILE_KEYS, type JobProfile } from "@/lib/fit";

/** Perfil de candidato del usuario actual (campos vacíos si no los cargó). */
export async function getJobProfile(): Promise<JobProfile> {
  const map = await getSettingsMap([...JOB_PROFILE_KEYS]);
  return Object.fromEntries(
    JOB_PROFILE_KEYS.map((k) => [k, map.get(k) ?? ""])
  ) as JobProfile;
}
