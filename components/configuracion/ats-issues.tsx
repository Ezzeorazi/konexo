import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { AtsCheck } from "@/lib/cv-ats";

/** Resultado del chequeo de legibilidad ATS (lib/cv-ats.ts). */
export function AtsIssues({ ats }: { ats: AtsCheck }) {
  if (ats.issues.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-hero">
        <CheckCircle2 className="size-4 shrink-0" />
        Legible para un ATS: email, teléfono y secciones se leen bien.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5 rounded-md border-2 border-ink/20 bg-muted/30 p-2 text-sm">
      {ats.issues.map((i) => (
        <li key={i.message} className="flex items-start gap-1.5">
          {i.level === "error" ? (
            <XCircle className="mt-0.5 size-4 shrink-0 text-alarm" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ink/60" />
          )}
          <span>{i.message}</span>
        </li>
      ))}
    </ul>
  );
}
