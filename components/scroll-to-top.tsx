"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Botón "volver arriba" fijo en la esquina inferior derecha. Aparece recién
// cuando scrolleaste un poco. Solo cliente (usa scroll del window).
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver arriba"
      className={
        "btn-comic fixed right-4 bottom-4 z-50 flex size-12 items-center justify-center rounded-full bg-komic text-ink transition-all sm:right-6 sm:bottom-6 " +
        (visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0")
      }
    >
      <ArrowUp className="size-6" />
    </button>
  );
}
