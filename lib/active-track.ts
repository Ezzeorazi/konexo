import { cookies } from "next/headers";
import { getSetting } from "@/lib/settings";
import { DEFAULT_TRACK, TRACKS, isTrack, type Track } from "@/lib/tracks";

export const ACTIVE_TRACK_COOKIE = "konexo-track";
export const ENABLED_TRACKS_KEY = "enabledTracks";

/** Tracks que el usuario habilitó en Configuración (siempre al menos uno). */
export async function getEnabledTracks(): Promise<Track[]> {
  const value = await getSetting(ENABLED_TRACKS_KEY);
  const parsed = (value ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(isTrack);
  const unique = TRACKS.filter((t) => parsed.includes(t));
  return unique.length > 0 ? unique : [DEFAULT_TRACK];
}

/**
 * Track con el que se está mirando la app: el de la cookie si sigue habilitado,
 * si no el primero habilitado. Resuelve también la lista de habilitados para
 * que el caller no tenga que pedirla de nuevo.
 */
export async function getActiveTrack(): Promise<{
  track: Track;
  enabled: Track[];
}> {
  const enabled = await getEnabledTracks();
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_TRACK_COOKIE)?.value;
  const track =
    isTrack(fromCookie) && enabled.includes(fromCookie)
      ? fromCookie
      : enabled[0];
  return { track, enabled };
}
