"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Navega en click sobre toda la superficie (no solo el texto). Los elementos
// interactivos anidados (botones, links) deben frenar la propagación con
// onClick stopPropagation para no disparar también la navegación de la fila.

function activate(target: EventTarget | null): boolean {
  // Evita navegar si el click salió de un control interactivo anidado.
  const el = target as HTMLElement | null;
  return !el?.closest("a,button,input,textarea,select,[role='menu']");
}

export function RowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <TableRow
      role="link"
      tabIndex={0}
      onClick={(e) => activate(e.target) && router.push(href)}
      onMouseEnter={() => router.prefetch(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </TableRow>
  );
}

export function ItemLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={(e) => activate(e.target) && router.push(href)}
      onMouseEnter={() => router.prefetch(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className={cn(
        "-mx-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  );
}
