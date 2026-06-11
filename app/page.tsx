import Link from "next/link";
import {
  CalendarClock,
  KanbanSquare,
  Users,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STAGES, stageLabels } from "@/lib/labels";
import { formatRelative, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

  const [stageCounts, oppFollowUps, contactFollowUps, contactCount] =
    await Promise.all([
      prisma.opportunity.groupBy({ by: ["stage"], _count: { _all: true } }),
      prisma.opportunity.findMany({
        where: { nextFollowUpAt: { not: null, lte: inTwoWeeks } },
        orderBy: { nextFollowUpAt: "asc" },
        include: { company: { select: { name: true } } },
        take: 10,
      }),
      prisma.contact.findMany({
        where: { nextFollowUpAt: { not: null, lte: inTwoWeeks } },
        orderBy: { nextFollowUpAt: "asc" },
        include: { company: { select: { name: true } } },
        take: 10,
      }),
      prisma.contact.count(),
    ]);

  const countByStage = new Map(
    stageCounts.map((s) => [s.stage, s._count._all])
  );
  const totalOpportunities = stageCounts.reduce(
    (acc, s) => acc + s._count._all,
    0
  );

  type FollowUp = {
    key: string;
    href: string;
    title: string;
    subtitle: string | null;
    date: Date;
    kind: "opportunity" | "contact";
  };

  const followUps: FollowUp[] = [
    ...oppFollowUps.map((o) => ({
      key: `o-${o.id}`,
      href: `/oportunidades/${o.id}`,
      title: o.title,
      subtitle: o.company?.name ?? null,
      date: o.nextFollowUpAt!,
      kind: "opportunity" as const,
    })),
    ...contactFollowUps.map((c) => ({
      key: `c-${c.id}`,
      href: `/contactos/${c.id}`,
      title: c.name,
      subtitle: [c.role, c.company?.name].filter(Boolean).join(" · ") || null,
      date: c.nextFollowUpAt!,
      kind: "contact" as const,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Tus próximos follow-ups y el estado del embudo."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {STAGES.map((stage) => (
          <Link key={stage} href="/oportunidades">
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold">
                  {countByStage.get(stage) ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stageLabels[stage]}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              Próximos follow-ups
            </CardTitle>
            <CardDescription>
              Vencidos y de los próximos 14 días, entre oportunidades y
              contactos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada agendado. Definí el próximo follow-up en tus oportunidades
                y contactos: el seguimiento es lo que mueve el embudo.
              </p>
            ) : (
              <ul className="divide-y">
                {followUps.map((fu) => {
                  const overdue = fu.date < now;
                  return (
                    <li key={fu.key}>
                      <Link
                        href={fu.href}
                        className="flex items-center justify-between gap-3 py-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {fu.kind === "opportunity" ? (
                            <KanbanSquare className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <Users className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{fu.title}</p>
                            {fu.subtitle ? (
                              <p className="text-xs text-muted-foreground">
                                {fu.subtitle}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            overdue
                              ? "font-medium text-rose-600"
                              : "text-muted-foreground"
                          )}
                          title={formatDate(fu.date)}
                        >
                          {overdue ? "Vencido · " : ""}
                          {formatRelative(fu.date)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tu búsqueda en números</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <KanbanSquare className="size-4" />
                  Oportunidades activas
                </span>
                <span className="font-medium">{totalOpportunities}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  Contactos en tu red
                </span>
                <span className="font-medium">{contactCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                {
                  href: "/oportunidades",
                  label: "Ir al tablero de oportunidades",
                },
                { href: "/contactos", label: "Ver tu red de contactos" },
                { href: "/empresas", label: "Explorar empresas" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {l.label}
                  <ArrowRight className="size-4" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
