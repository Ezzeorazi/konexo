import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { DEFAULT_TRACK, TRACKS, isTrack, type Track } from "@/lib/tracks";

export const ACTIVE_TRACK_COOKIE = "konexo-track";
export const ENABLED_TRACKS_KEY = "enabledTracks";

/**
 * Tracks visibles para el usuario (siempre al menos uno). Es la UNIÓN de:
 * - los que habilitó en Configuración, y
 * - cualquier modo donde YA tenga datos (oportunidades/empresas/contactos).
 *
 * Lo segundo es clave: si deshabilitás un modo que tiene datos, esos datos NO
 * se pierden ni se esconden — el modo sigue accesible para no orfanar nada.
 */
export async function getEnabledTracks(): Promise<Track[]> {
  const userId = await currentUserId();
  const [value, oppTracks, companyTracks, contactTracks] = await Promise.all([
    getSetting(ENABLED_TRACKS_KEY),
    prisma.opportunity.findMany({
      where: { userId },
      distinct: ["track"],
      select: { track: true },
    }),
    prisma.company.findMany({
      where: { userId },
      distinct: ["track"],
      select: { track: true },
    }),
    prisma.contact.findMany({
      where: { userId },
      distinct: ["track"],
      select: { track: true },
    }),
  ]);

  const saved = (value ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(isTrack);
  const withData = [...oppTracks, ...companyTracks, ...contactTracks]
    .map((r) => r.track)
    .filter(isTrack);

  const all = new Set<Track>([...saved, ...withData]);
  const unique = TRACKS.filter((t) => all.has(t));
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
