"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSettings } from "@/app/configuracion/actions";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google (Gemini)" },
];

export function AiSettingsForm({
  initialProvider,
  initialApiKey,
}: {
  initialProvider: string;
  initialApiKey: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showKey, setShowKey] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveSettings([
        { key: "aiProvider", value: String(form.get("aiProvider") ?? "anthropic") },
        { key: "aiApiKey", value: String(form.get("aiApiKey") ?? "") },
      ]);
      toast.success("Configuración guardada.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Proveedor de IA</Label>
        <Select
          name="aiProvider"
          defaultValue={initialProvider}
          items={PROVIDERS}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiApiKey">API key</Label>
        <div className="flex gap-2">
          <Input
            id="aiApiKey"
            name="aiApiKey"
            type={showKey ? "text" : "password"}
            defaultValue={initialApiKey}
            placeholder="sk-..."
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowKey((v) => !v)}
          >
            {showKey ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        La key se guarda únicamente en la base SQLite local de tu máquina. No
        se envía a ningún servidor. Se va a usar en la próxima etapa para el
        tailoring de CV con IA.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar configuración"}
      </Button>
    </form>
  );
}
