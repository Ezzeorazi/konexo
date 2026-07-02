import Link from "next/link";
import {
  CalendarClock,
  KanbanSquare,
  Users,
  ArrowRight,
  UserPlus,
  PartyPopper,
  Building2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Reveal } from "@/components/comic/reveal";
import { ComicMarquee } from "@/components/comic/comic-marquee";
import { MissionsPanel } from "@/components/onboarding/missions-panel";
import { DailyReviewButton } from "@/components/dashboard/daily-review";
import { getProgress } from "@/lib/onboarding";
import { getActiveTrack } from "@/lib/active-track";
import { getVocab, tileFor } from "@/lib/tracks";
import { getTrackStages } from "@/lib/stages";
import { formatRelative, formatOverdue, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await currentUserId();
  const { track } = await getActiveTrack();
  const vocab = getVocab(track);
  const stages = await getTrackStages(track);
  const lastStageKey = stages[stages.length - 1]?.key ?? "CLOSED";

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

  const [
    stageCounts,
    oppFollowUps,
    contactFollowUps,
    contactCount,
    noContactOpps,
    onboarding,
  ] = await Promise.all([
    prisma.opportunity.groupBy({
      by: ["stage"],
      where: { userId, track },
      _count: { _all: true },
    }),
    prisma.opportunity.findMany({
      where: { userId, track, nextFollowUpAt: { not: null, lte: inTwoWeeks } },
      orderBy: { nextFollowUpAt: "asc" },
      include: { company: { select: { name: true } } },
      take: 10,
    }),
    prisma.contact.findMany({
      where: { userId, track, nextFollowUpAt: { not: null, lte: inTwoWeeks } },
      orderBy: { nextFollowUpAt: "asc" },
      include: { company: { select: { name: true } } },
      take: 10,
    }),
    prisma.contact.count({ where: { userId, track } }),
    // Oportunidades/negocios activos sin ningún contacto en su empresa (o sin
    // empresa): ahí no hay puente posible para un referido / decisor todavía
    prisma.opportunity.findMany({
      where: {
        userId,
        track,
        stage: { not: lastStageKey },
        OR: [{ companyId: null }, { company: { contacts: { none: {} } } }],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        company: { select: { name: true } },
      },
    }),
    getProgress(userId),
  ]);

  const countByStage = new Map(stageCounts.map((s) => [s.stage, s._count._all]));
  const totalOpportunities = stageCounts.reduce(
    (acc, s) => acc + s._count._all,
    0
  );

  // Forecast ponderado: Σ (monto × probabilidad de su etapa) sobre lo abierto.
  const stageByKey = new Map(stages.map((s) => [s.key, s]));
  let pipelineValue = 0; // monto total en juego (etapas abiertas)
  let weightedValue = 0; // monto ponderado por probabilidad
  let wonValue = 0; // ya ganado
  if (vocab.hasValue) {
    const valued = await prisma.opportunity.findMany({
      where: { userId, track, value: { not: null } },
      select: { value: true, stage: true },
    });
    for (const o of valued) {
      const st = stageByKey.get(o.stage);
      const v = o.value ?? 0;
      if (st?.type === "won") wonValue += v;
      else if (st?.type !== "lost") {
        pipelineValue += v;
        weightedValue += (v * (st?.probability ?? 0)) / 100;
      }
    }
  }
  const fmtMoney = (n: number) =>
    n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
  // Para los chips del hero usamos las dos últimas etapas del embudo del track.
  const penultStage = stages[stages.length - 2] ?? stages[stages.length - 1];
  const lastStage = stages[stages.length - 1];
  const penultCount = penultStage
    ? countByStage.get(penultStage.key) ?? 0
    : 0;
  const lastCount = lastStage ? countByStage.get(lastStage.key) ?? 0 : 0;

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
  const overdueCount = followUps.filter((fu) => fu.date < now).length;

  return (
    <div>
      {/* ===== MARQUEE (full-bleed, fondo negro, en movimiento) ===== */}
      <ComicMarquee className="-mx-6 -mt-6 mb-8 md:-mx-8" />

      {/* ===== HERO BANNER ===== */}
      <Reveal anim="rip">
        <header className="speedlines relative mb-8 overflow-hidden rounded-lg border-4 border-ink bg-paper p-6 shadow-[7px_7px_0_var(--color-ink)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-block -rotate-2 bg-ink px-3 py-1 font-display text-sm tracking-widest text-paper">
                EPISODIO DE HOY · TU PLAN DE ATAQUE
              </div>
              <h1 className="stroke-ink mt-4 font-display text-4xl leading-[0.95] tracking-wide text-komic md:text-6xl">
                CENTRO DE <span className="text-alarm">MISIONES</span>
              </h1>
              <p className="mt-3 font-hand text-xl text-ink">
                Tus próximos follow-ups y el estado del embudo, panel por panel.
                Nada se te escapa.
              </p>

              {/* Botones cómic */}
              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/oportunidades"
                  className="btn-comic rough bg-alarm px-6 py-2.5 font-display text-xl tracking-wider text-paper"
                >
                  VER {vocab.oppPlural.toUpperCase()}
                </Link>
                <Link
                  href="/contactos"
                  className="btn-comic rough-2 bg-panelw px-6 py-2.5 font-display text-xl tracking-wider text-ink"
                >
                  MI RED
                </Link>
                <DailyReviewButton />
              </div>
            </div>

            {/* burst con el resumen vivo */}
            <div className="burst burst-shadow float-bob flex h-36 w-36 flex-col bg-komic halftone-yellow md:h-44 md:w-44">
              <span className="font-display text-5xl text-ink md:text-6xl">
                {totalOpportunities}
              </span>
              <span className="px-2 text-center font-display text-sm leading-tight tracking-wide text-alarm">
                {vocab.oppPlural.toUpperCase()}
                <br />
                EN JUEGO
              </span>
            </div>
          </div>

          <div className="mt-6 inline-block max-w-full wrap-break-word bg-ink px-4 py-1.5 font-display tracking-widest text-komic">
            {totalOpportunities} EN JUEGO · {penultCount}{" "}
            {penultStage?.label.toUpperCase()} · {lastCount}{" "}
            {lastStage?.label.toUpperCase()}
            <span className="cursor-blink">▌</span>
          </div>
        </header>
      </Reveal>

      {/* ===== STAT TILES POR ETAPA ===== */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {stages.map((stage, i) => {
          const s = tileFor(stages, stage.key);
          return (
            <Reveal key={stage.key} anim="pop" delay={i * 70}>
              <Link href="/oportunidades" className="block">
                <Card className="panel-hover h-full gap-0 p-0">
                  <div
                    className={cn(
                      "border-b-[3px] border-ink px-3 py-1.5 font-display text-sm tracking-wide",
                      s.bar,
                      s.text
                    )}
                  >
                    {stage.label.toUpperCase()}
                  </div>
                  <div className="px-3 py-3">
                    <p className="font-display text-4xl leading-none text-ink">
                      {countByStage.get(stage.key) ?? 0}
                    </p>
                  </div>
                </Card>
              </Link>
            </Reveal>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* ===== FOLLOW-UPS ===== */}
        <Reveal anim="pop" className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <CalendarClock className="size-5 text-alarm" />
                PRÓXIMOS FOLLOW-UPS
                {overdueCount > 0 ? (
                  <span className="rotate-2 rounded-md border-2 border-ink bg-alarm px-2 py-0.5 font-display text-xs tracking-wide text-paper">
                    {overdueCount} VENCIDOS
                  </span>
                ) : null}
              </CardTitle>
              <CardDescription className="font-hand text-base">
                Vencidos y de los próximos 14 días, entre oportunidades y
                contactos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {followUps.length === 0 ? (
                <p className="font-hand text-lg text-muted-foreground">
                  Nada agendado. Definí el próximo follow-up en tus
                  oportunidades y contactos: el seguimiento es lo que mueve el
                  embudo. 💪
                </p>
              ) : (
                <ul className="divide-y-2 divide-dashed divide-ink/20">
                  {followUps.map((fu) => {
                    const overdue = fu.date < now;
                    return (
                      <li key={fu.key}>
                        <Link
                          href={fu.href}
                          className="flex items-center justify-between gap-3 px-1 py-3 transition-colors hover:bg-komic/30"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink bg-paper">
                              {fu.kind === "opportunity" ? (
                                <KanbanSquare className="size-4 text-ink" />
                              ) : (
                                <Users className="size-4 text-ink" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium wrap-break-word text-ink">
                                {fu.title}
                              </p>
                              {fu.subtitle ? (
                                <p className="font-hand text-sm text-muted-foreground">
                                  {fu.subtitle}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-md border-2 border-ink px-2 py-0.5 font-display text-xs tracking-wide",
                              overdue
                                ? "bg-alarm text-paper"
                                : "bg-paper text-ink"
                            )}
                            title={formatDateTime(fu.date)}
                          >
                            {overdue
                              ? formatOverdue(fu.date)
                              : formatRelative(fu.date)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <div className="space-y-6">
          {/* ===== MISIONES DE ONBOARDING ===== */}
          <Reveal anim="pop">
            <MissionsPanel initialState={onboarding} />
          </Reveal>

          {/* ===== FORECAST PONDERADO ===== */}
          {vocab.hasValue ? (
            <Reveal anim="pop">
              <Card className="bg-ink text-paper">
                <CardHeader>
                  <CardTitle className="text-komic">FORECAST</CardTitle>
                  <CardDescription className="font-hand text-base text-paper/70">
                    Ponderado por la probabilidad de cada etapa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-display text-4xl leading-none text-komic">
                      {fmtMoney(weightedValue)}
                    </p>
                    <p className="font-hand text-sm text-paper/70">
                      proyección ponderada del pipeline
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-dashed border-paper/30 pt-2 font-hand text-base">
                    <span>En juego (sin ponderar)</span>
                    <span className="font-display text-xl">
                      {fmtMoney(pipelineValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-hand text-base">
                    <span>Ganado</span>
                    <span className="font-display text-xl text-hero">
                      {fmtMoney(wonValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ) : null}

          {/* ===== OPORTUNIDADES SIN CONTACTO ===== */}
          <Reveal anim="pop" delay={80}>
            <Card className="bg-komic">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-5 text-alarm" />
                  SIN CONTACTO
                </CardTitle>
                <CardDescription className="font-hand text-base text-ink/70">
                  {track === "sales"
                    ? "Acá todavía no identificaste un decisor: buscá con quién hablar."
                    : "Acá no conocés a nadie todavía: buscá un puente que pueda referirte."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {noContactOpps.length === 0 ? (
                  <p className="flex items-start gap-2 font-hand text-base text-ink">
                    <PartyPopper className="mt-0.5 size-5 shrink-0 text-hero" />
                    Tenés un contacto en cada empresa activa, ¡bien ahí!
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {noContactOpps.map((opp) => (
                      <li key={opp.id}>
                        <Link
                          href={`/oportunidades/${opp.id}`}
                          className="group flex items-center justify-between gap-2 rounded-md border-2 border-ink bg-paper px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium wrap-break-word text-ink">
                              {opp.title}
                            </p>
                            <p className="flex items-center gap-1 font-hand text-sm text-muted-foreground">
                              <Building2 className="size-3.5 shrink-0" />
                              <span className="min-w-0 truncate">
                                {opp.company?.name ?? "Sin empresa asignada"}
                              </span>
                            </p>
                          </div>
                          <ArrowRight className="size-4 shrink-0 text-ink/50 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          {/* ===== NÚMEROS ===== */}
          <Reveal anim="pop" delay={160}>
            <Card className="bg-hero text-paper">
              <CardHeader>
                <CardTitle className="text-paper">
                  {track === "sales" ? "TU PIPELINE EN NÚMEROS" : "TU BÚSQUEDA EN NÚMEROS"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-paper/40 pb-2">
                  <span className="flex min-w-0 items-center gap-2 font-hand text-base">
                    <KanbanSquare className="size-4 shrink-0" />
                    <span className="min-w-0 truncate">{`${vocab.oppPlural} activas`}</span>
                  </span>
                  <span className="shrink-0 font-display text-3xl">
                    {totalOpportunities}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 font-hand text-base">
                    <Users className="size-4 shrink-0" />
                    <span className="min-w-0 truncate">Contactos en tu red</span>
                  </span>
                  <span className="shrink-0 font-display text-3xl">
                    {contactCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* ===== ACCESOS RÁPIDOS (botones cómic) ===== */}
          <Reveal anim="pop" delay={240}>
            <Card>
              <CardHeader>
                <CardTitle>ACCESOS RÁPIDOS</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {[
                  {
                    href: "/oportunidades",
                    label: "TABLERO",
                    bg: "bg-komic text-ink",
                  },
                  {
                    href: "/contactos",
                    label: "MI RED",
                    bg: "bg-hero text-paper",
                  },
                  {
                    href: "/empresas",
                    label: "EMPRESAS",
                    bg: "bg-paper text-ink",
                  },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "btn-comic flex items-center justify-between rounded-md px-4 py-2 font-display text-lg tracking-wide",
                      l.bg
                    )}
                  >
                    {l.label}
                    <ArrowRight className="size-5" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
