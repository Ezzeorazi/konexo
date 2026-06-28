import { prisma } from "@/lib/prisma";
import { buildCalendar, type IcsEvent } from "@/lib/ics";
import { getVocab, stageLabel, isTrack, DEFAULT_TRACK, type Track } from "@/lib/tracks";

// Feed iCalendar PÚBLICO de los follow-ups del usuario. No usa la sesión de
// Clerk (las apps de calendario no mandan cookies): se autentica con el token
// secreto del path, que mapeamos a un userId vía la tabla Setting. El proxy deja
// /api/calendario(.*) como ruta pública.

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/calendario/[token]">
) {
  const { token } = await ctx.params;

  // Token corto/ inválido: no tocamos la DB.
  if (!token || token.length < 16 || token.length > 128) {
    return new Response("Not found", { status: 404 });
  }

  const setting = await prisma.setting.findFirst({
    where: { key: "calendarToken", value: token },
    select: { userId: true },
  });
  if (!setting) {
    return new Response("Not found", { status: 404 });
  }
  const { userId } = setting;
  const origin = new URL(_req.url).origin;

  const [opportunities, contacts] = await Promise.all([
    prisma.opportunity.findMany({
      where: { userId, nextFollowUpAt: { not: null } },
      select: {
        id: true,
        title: true,
        track: true,
        stage: true,
        nextFollowUpAt: true,
        company: { select: { name: true } },
      },
    }),
    prisma.contact.findMany({
      where: { userId, nextFollowUpAt: { not: null } },
      select: {
        id: true,
        name: true,
        role: true,
        track: true,
        nextFollowUpAt: true,
        company: { select: { name: true } },
      },
    }),
  ]);

  const events: IcsEvent[] = [];

  for (const o of opportunities) {
    if (!o.nextFollowUpAt) continue;
    const track = (isTrack(o.track) ? o.track : DEFAULT_TRACK) as Track;
    const vocab = getVocab(track);
    const company = o.company?.name;
    events.push({
      uid: `opp-${o.id}@konexo`,
      date: o.nextFollowUpAt,
      summary: `${vocab.emoji} Follow-up: ${o.title}${company ? ` · ${company}` : ""}`,
      description: `Etapa: ${stageLabel(track, o.stage)} · Modo: ${vocab.name}`,
      url: `${origin}/oportunidades/${o.id}`,
    });
  }

  for (const c of contacts) {
    if (!c.nextFollowUpAt) continue;
    const track = (isTrack(c.track) ? c.track : DEFAULT_TRACK) as Track;
    const vocab = getVocab(track);
    const company = c.company?.name;
    events.push({
      uid: `contact-${c.id}@konexo`,
      date: c.nextFollowUpAt,
      summary: `${vocab.emoji} Contactar: ${c.name}${company ? ` · ${company}` : ""}`,
      description: `${c.role ? `${c.role} · ` : ""}Modo: ${vocab.name}`,
      url: `${origin}/contactos/${c.id}`,
    });
  }

  const body = buildCalendar(events, "Konexo · Follow-ups");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="konexo.ics"',
      "Cache-Control": "no-store",
    },
  });
}
