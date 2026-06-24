import { cn } from "@/lib/utils";

const PHRASES: { text: string; star: string }[] = [
  { text: "¡ZAS! POSTULACIONES ORGANIZADAS", star: "text-komic" },
  { text: "¡BAM! FOLLOW-UPS A TIEMPO", star: "text-alarm" },
  { text: "¡POW! ENTREVISTAS BAJO CONTROL", star: "text-hero" },
];

/**
 * Cinta animada estilo cómic, fondo negro, que se desplaza en loop.
 * El set de frases se renderiza dos veces para que el translateX(-50%)
 * del keyframe `marquee` cicle sin cortes.
 */
export function ComicMarquee({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden border-y-4 border-ink bg-ink py-3",
        className
      )}
    >
      <div className="marquee-track flex w-max font-display text-xl tracking-widest whitespace-nowrap text-paper md:text-2xl">
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0" aria-hidden={group === 1}>
            {PHRASES.map((p) => (
              <span key={p.text} className="flex items-center">
                <span className="px-6">{p.text}</span>
                <span className={cn("px-6", p.star)}>★</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
