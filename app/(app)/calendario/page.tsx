import Link from "next/link";
import { headers } from "next/headers";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubscribeCard } from "@/components/calendario/subscribe-card";
import { formatDate, formatRelative } from "@/lib/dates";
import { getVocab, isTrack, DEFAULT_TRACK, type Track } from "@/lib/tracks";

export const dynamic = "force-dynamic";

type AgendaItem = {
  id: string;
  href: string;
  date: Date;
  emoji: string;
  label: string;
  detail: string;
};

export default async function CalendarioPage() {
  const userId = await currentUserId();

  const [token, opportunities, contacts] = await Promise.all([
    getSetting("calendarToken"),
    prisma.opportunity.findMany({
      where: { userId, nextFollowUpAt: { not: null } },
      orderBy: { nextFollowUpAt: "asc" },
      select: {
        id: true,
        title: true,
        track: true,
        nextFollowUpAt: true,
        company: { select: { name: true } },
      },
    }),
    prisma.contact.findMany({
      where: { userId, nextFollowUpAt: { not: null } },
      orderBy: { nextFollowUpAt: "asc" },
      select: {
        id: true,
        name: true,
        track: true,
        nextFollowUpAt: true,
        company: { select: { name: true } },
      },
    }),
  ]);

  // Construimos la URL absoluta del feed desde los headers del request.
  const h = await headers();
  const host = h.get("host");
  const isLocal = Boolean(host && /^(localhost|127\.0\.0\.1)(:|$)/.test(host));
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  const url = token && host ? `${proto}://${host}/api/calendario/${token}` : null;

  const items: AgendaItem[] = [];
  for (const o of opportunities) {
    if (!o.nextFollowUpAt) continue;
    const vocab = getVocab((isTrack(o.track) ? o.track : DEFAULT_TRACK) as Track);
    items.push({
      id: `opp-${o.id}`,
      href: `/oportunidades/${o.id}`,
      date: o.nextFollowUpAt,
      emoji: vocab.emoji,
      label: o.title,
      detail: o.company?.name ?? vocab.name,
    });
  }
  for (const c of contacts) {
    if (!c.nextFollowUpAt) continue;
    const vocab = getVocab((isTrack(c.track) ? c.track : DEFAULT_TRACK) as Track);
    items.push({
      id: `contact-${c.id}`,
      href: `/contactos/${c.id}`,
      date: c.nextFollowUpAt,
      emoji: vocab.emoji,
      label: c.name,
      detail: c.company?.name ?? "Contacto",
    });
  }
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const overdue = items.filter((i) => i.date < startOfToday);
  const upcoming = items.filter((i) => i.date >= startOfToday);

  return (
    <div>
      <PageHeader
        title="Calendario"
        description="Tus follow-ups en un solo lugar. Suscribilo en el teléfono para recibirlos ahí."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No tenés follow-ups agendados. Asigná una fecha de “Próximo
                follow-up” en tus oportunidades o contactos y van a aparecer acá.
              </CardContent>
            </Card>
          ) : (
            <>
              {overdue.length > 0 ? (
                <AgendaList
                  title={`Vencidos (${overdue.length})`}
                  items={overdue}
                  overdue
                />
              ) : null}
              <AgendaList
                title={`Próximos (${upcoming.length})`}
                items={upcoming}
              />
            </>
          )}
        </div>

        <div className="space-y-6">
          <SubscribeCard url={url} />
        </div>
      </div>
    </div>
  );
}

function AgendaList({
  title,
  items,
  overdue = false,
}: {
  title: string;
  items: AgendaItem[];
  overdue?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada por ahora.</p>
        ) : (
          items.map((i) => (
            <Link
              key={i.id}
              href={i.href}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-base leading-none">{i.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.detail}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm">{formatDate(i.date)}</p>
                <p
                  className={
                    overdue
                      ? "text-xs text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {formatRelative(i.date)}
                </p>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
