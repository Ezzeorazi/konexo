"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Anim = "pop" | "burst" | "rip";

/**
 * Envoltorio que dispara la animación cómic ("¡pum!") cuando el elemento
 * entra en viewport. Pensado para el dashboard: misma esencia que la landing
 * pero más sobrio. Si el usuario prefiere menos movimiento, se muestra directo.
 */
export function Reveal({
  children,
  anim = "pop",
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  anim?: Anim;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // El media query de "reduced motion" en globals.css ya fuerza .reveal
    // visible y desactiva la animación, así que acá solo observamos el scroll.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        window.setTimeout(() => setShown(true), delay);
        io.disconnect();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={cn("reveal", shown && `in-${anim}`, className)}>
      {children}
    </div>
  );
}
