"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, PlugZap, Sparkles } from "lucide-react";
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
import { saveSettings, testAiConnection } from "@/app/(app)/configuracion/actions";

const PROVIDERS = [
  { value: "groq", label: "Groq (gratis, en la nube)" },
  { value: "ollama", label: "Ollama (local, gratis)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google (Gemini)" },
];

const DEFAULT_MODEL_PLACEHOLDER: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
  ollama: "llama3.2",
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
};

export function AiSettingsForm({
  hasServerDefault = false,
  userHasKey = false,
  initialProvider,
  initialApiKey,
  initialModel,
  initialBaseUrl,
}: {
  hasServerDefault?: boolean;
  userHasKey?: boolean;
  initialProvider: string;
  initialApiKey: string;
  initialModel: string;
  initialBaseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState(initialProvider);

  // La IA compartida está activa cuando el server tiene key y el usuario no
  // cargó la suya (usa el default del dueño). Si el usuario pone su propia key,
  // manda la suya y este cartel deja de aplicar.
  const usingSharedDefault = hasServerDefault && !userHasKey;

  function save(form: FormData) {
    return saveSettings([
      { key: "aiProvider", value: provider },
      { key: "aiApiKey", value: String(form.get("aiApiKey") ?? "") },
      { key: "aiModel", value: String(form.get("aiModel") ?? "") },
      { key: "aiBaseUrl", value: String(form.get("aiBaseUrl") ?? "") },
    ]);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await save(form);
      toast.success("Configuración guardada.");
    });
  }

  function handleTest(e: React.MouseEvent<HTMLButtonElement>) {
    const form = new FormData(e.currentTarget.form!);
    startTransition(async () => {
      await save(form);
      const result = await testAiConnection();
      if (result.ok) {
        toast.success(`Conexión OK. El modelo respondió: "${result.text}"`);
      } else {
        toast.error(result.error, { duration: 10000 });
      }
    });
  }

  const isOllama = provider === "ollama";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {usingSharedDefault ? (
        <p className="flex items-start gap-2 rounded-md border-[2.5px] border-ink bg-komic/40 px-3 py-2 text-xs text-ink">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          <span>
            <b>IA activada.</b> Ya podés usar el asistente sin configurar nada.
            Lo de abajo es opcional: solo si querés usar tu propio proveedor o
            key.
          </span>
        </p>
      ) : null}

      <div className="space-y-2">
        <Label>Proveedor de IA</Label>
        <Select
          value={provider}
          onValueChange={(value) => setProvider(String(value))}
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

      {isOllama ? (
        <div className="space-y-2">
          <Label htmlFor="aiBaseUrl">URL de Ollama</Label>
          <Input
            id="aiBaseUrl"
            name="aiBaseUrl"
            defaultValue={initialBaseUrl}
            placeholder="http://localhost:11434"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="aiApiKey">API key</Label>
          <div className="flex gap-2">
            <Input
              id="aiApiKey"
              name="aiApiKey"
              type={showKey ? "text" : "password"}
              defaultValue={initialApiKey}
              placeholder={provider === "groq" ? "gsk_..." : "sk-..."}
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
      )}

      <div className="space-y-2">
        <Label htmlFor="aiModel">Modelo</Label>
        <Input
          id="aiModel"
          name="aiModel"
          defaultValue={initialModel}
          placeholder={DEFAULT_MODEL_PLACEHOLDER[provider] ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          {isOllama
            ? "Tiene que estar descargado: corré `ollama pull <modelo>` primero. Vacío usa el de la sugerencia."
            : "Vacío usa el modelo sugerido del proveedor."}
        </p>
      </div>

      {/* Los campos ocultos conservan el valor del modo no visible al guardar */}
      {isOllama ? (
        <input type="hidden" name="aiApiKey" value={initialApiKey} />
      ) : (
        <input type="hidden" name="aiBaseUrl" value={initialBaseUrl} />
      )}

      <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        {isOllama
          ? "Con Ollama todo corre en tu máquina: ni tu CV ni los avisos salen a internet."
          : provider === "groq"
            ? "Groq tiene capa gratuita: creá tu key en console.groq.com (botón API Keys), sin tarjeta. La key se guarda solo en tu SQLite local."
            : "La key se guarda únicamente en la base SQLite local de tu máquina y solo se usa para llamar al proveedor que elegiste."}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar configuración"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={handleTest}
        >
          <PlugZap className="size-4" />
          Probar conexión
        </Button>
      </div>
    </form>
  );
}
