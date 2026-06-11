"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/oportunidades", label: "Oportunidades", icon: KanbanSquare },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r bg-background md:w-60">
      <div className="flex h-16 items-center justify-center border-b px-4 md:justify-start">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            k
          </span>
          <span className="hidden text-lg font-semibold tracking-tight md:inline">
            konexo
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2 md:p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors md:justify-start",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t p-4 text-xs text-muted-foreground md:block">
        Local-first · tus datos quedan en tu máquina
      </div>
    </aside>
  );
}
