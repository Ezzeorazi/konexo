"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  Settings,
  Home,
  Bot,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@clerk/nextjs";
import { setActiveTrack } from "@/app/(app)/configuracion/actions";
import { getVocab, type Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";

export function Sidebar({
  activeTrack,
  enabledTracks,
}: {
  activeTrack: Track;
  enabledTracks: Track[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const vocab = getVocab(activeTrack);
  // NEXT_PUBLIC_* se inlinea en build: si no hay key, no montamos UI de Clerk.
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/oportunidades", label: vocab.oppPlural, icon: KanbanSquare },
    { href: "/empresas", label: vocab.companyPlural, icon: Building2 },
    { href: "/contactos", label: "Contactos", icon: Users },
    { href: "/asistente", label: "Asistente IA", icon: Bot },
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ];

  function switchTrack(track: Track) {
    if (track === activeTrack || pending) return;
    startTransition(async () => {
      await setActiveTrack(track);
      router.refresh();
      toast.success(`Modo ${getVocab(track).name}.`);
    });
  }

  // Cuerpo compartido entre el riel de escritorio y el drawer móvil.
  // `onNavigate` cierra el drawer al tocar un link en móvil. Es una función de
  // render (no un componente) para compartir los closures sin remontar estado.
  const renderBody = (onNavigate?: () => void) => (
    <>
        {enabledTracks.length > 1 ? (
          <div className="border-b-[3px] border-sidebar-border p-3">
            <p className="mb-1.5 px-1 font-display text-[10px] tracking-[0.2em] text-sidebar-foreground/60">
              MODO
            </p>
            <div className="flex flex-col gap-1">
              {enabledTracks.map((track) => {
                const v = getVocab(track);
                const active = track === activeTrack;
                return (
                  <button
                    key={track}
                    type="button"
                    onClick={() => switchTrack(track)}
                    disabled={pending}
                    title={v.name}
                    className={cn(
                      "flex items-center gap-2 rounded-md border-[2.5px] px-2 py-1.5 font-display text-xs tracking-wide transition-all",
                      active
                        ? "border-ink bg-komic text-ink shadow-[2px_2px_0_var(--color-paper)]"
                        : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="text-base leading-none">{v.emoji}</span>
                    <span className="truncate">{v.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <nav className="flex flex-1 flex-col gap-1.5 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md border-[2.5px] px-3 py-2 font-display text-base tracking-wide transition-all",
                  active
                    ? "-rotate-1 border-ink bg-komic text-ink shadow-[3px_3px_0_var(--color-paper)]"
                    : "border-transparent text-sidebar-foreground/80 hover:border-paper hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t-[3px] border-sidebar-border px-3 py-2">
          <Link
            href="/home"
            title="Ver la landing"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-md border-[2.5px] border-transparent px-2 py-1.5 font-display text-xs tracking-wide text-sidebar-foreground/60 transition-all hover:border-paper hover:text-sidebar-accent-foreground"
          >
            <Home className="size-4 shrink-0" />
            <span>Landing</span>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2 border-t-[3px] border-sidebar-border p-4 font-hand text-sm text-sidebar-foreground/70">
          <span>Tu CRM personal 🦾</span>
          {hasClerk ? <UserButton /> : null}
        </div>
      </>
  );

  const logo = (
    <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
      <span className="flex size-9 rotate-[-4deg] items-center justify-center rounded-md border-[2.5px] border-paper bg-komic font-display text-2xl text-ink shadow-[3px_3px_0_var(--color-paper)]">
        K
      </span>
      <span className="font-display text-2xl tracking-wider">
        KONE<span className="text-alarm">X</span>O
      </span>
    </Link>
  );

  return (
    <>
      {/* ===== Riel completo (escritorio) ===== */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r-[3px] border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b-[3px] border-sidebar-border px-4">
          {logo}
        </div>
        {renderBody()}
      </aside>

      {/* ===== Barra superior (móvil) ===== */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b-[3px] border-sidebar-border bg-sidebar px-3 text-sidebar-foreground md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          className="flex size-10 items-center justify-center rounded-md border-[2.5px] border-paper bg-sidebar-accent text-sidebar-foreground transition-transform active:translate-y-px"
        >
          <Menu className="size-5" />
        </button>
        {logo}
        <span
          className="flex size-10 items-center justify-center text-xl"
          title={vocab.name}
          aria-hidden
        >
          {vocab.emoji}
        </span>
      </header>

      {/* ===== Drawer (móvil) ===== */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50 supports-backdrop-filter:backdrop-blur-xs"
          />
          <aside className="absolute top-0 left-0 flex h-full w-72 max-w-[85vw] flex-col border-r-[3px] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[6px_0_0_rgba(0,0,0,0.25)]">
            <div className="flex h-14 items-center justify-between border-b-[3px] border-sidebar-border px-3">
              {logo}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="flex size-9 items-center justify-center rounded-md border-[2.5px] border-paper bg-sidebar-accent transition-transform active:translate-y-px"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              {renderBody(() => setDrawerOpen(false))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
