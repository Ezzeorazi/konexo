"use client";

import { Label } from "@/components/ui/label";
import { EditableText } from "@/components/editable/editable-text";
import { saveSettings } from "@/app/(app)/configuracion/actions";
import { JOB_PROFILE_FIELDS, type JobProfile } from "@/lib/fit";

// Perfil de candidato (modo empleo). Cada campo se guarda solo al perder el
// foco, igual que el perfil de negocio. Lo usa "Evaluar fit".
export function JobProfileForm({ initial }: { initial: JobProfile }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {JOB_PROFILE_FIELDS.map((f) => {
        const multiline = "multiline" in f && f.multiline;
        return (
          <div
            key={f.key}
            className={multiline ? "space-y-2 sm:col-span-2" : "space-y-2"}
          >
            <Label>{f.label}</Label>
            <div className="rounded-lg border border-input p-1">
              <EditableText
                value={initial[f.key]}
                multiline={multiline}
                maxLength={4000}
                ariaLabel={`Editar ${f.label}`}
                onSave={(value: string) => saveSettings([{ key: f.key, value }])}
                placeholder={f.placeholder}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
