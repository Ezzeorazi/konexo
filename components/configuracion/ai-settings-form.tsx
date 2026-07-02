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
import { saveAiSettings, testAiConnection } from "@/app/(app)/configuracion/actions";

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
  apiKeyPreview = "",
  initialProvider,
  initialModel,
  initialBaseUrl,
}: {
  hasServerDefault?: boolean;
  userHasKey?: boolean;
  /** Preview enmascarado de la key guardada (ej. "gsk…x4Kp"). Nunca la key real. */
  apiKeyPreview?: string;
  initialProvider: string;
  initialModel: string;
  initialBaseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState(initialProvider);
  // Si el usuario borra su key para volver al default compartido.
  const [cleared, setCleared] = useState(false);

  // La IA compartida está activa cuando el server tiene key y el usuario no
  // cargó la suya (usa el default del dueño). Si el usuario pone su propia key,
  // manda la suya y este cartel deja de aplicar.
  const hasStoredKey = userHasKey && !cleared;
  const usingSharedDefault = hasServerDefault && !hasStoredKey;

  function save(form: FormData) {
    // La key nunca vino al cliente: solo mandamos lo que el usuario tipee. Campo
    // vacío = conservar la guardada (lo resuelve el server action).
    return saveAiSettings({
      provider,
      apiKey: String(form.get("aiApiKey") ?? ""),
      model: String(form.get("aiModel") ?? ""),
      baseUrl: String(form.get("aiBaseUrl") ?? initialBaseUrl),
      clearApiKey: cleared,
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await save(form);
      setCleared(false);
      toast.success("Configuración guardada.");
    });
  }

  function handleTest(e: React.MouseEvent<HTMLButtonElement>) {
    const form = new FormData(e.currentTarget.form!);
    startTransition(async () => {
      await save(form);
      setCleared(false);
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
              placeholder={
                hasStoredKey
                  ? `${apiKeyPreview} · dejá vacío para conservarla`
                  : provider === "groq"
                    ? "gsk_..."
                    : "sk-..."
              }
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
          {hasStoredKey ? (
            <p className="text-xs text-muted-foreground">
              Ya tenés una key guardada (<code>{apiKeyPreview}</code>). Por
              seguridad no se muestra completa. Dejá el campo vacío para
              conservarla, o pegá una nueva para reemplazarla.{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setCleared(true)}
              >
                Quitar mi key
              </button>{" "}
              (vuelve a usar la IA compartida).
            </p>
          ) : cleared ? (
            <p className="text-xs text-muted-foreground">
              Tu key se quitará al guardar. Volvés a usar la IA compartida.
            </p>
          ) : null}
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

      {/* Conserva el baseUrl de Ollama cuando el campo visible es el de la key */}
      {!isOllama ? (
        <input type="hidden" name="aiBaseUrl" value={initialBaseUrl} />
      ) : null}

      <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        {isOllama
          ? "Con Ollama todo corre en tu máquina: ni tu CV ni los avisos salen a internet."
          : provider === "groq"
            ? "Groq tiene capa gratuita: creá tu key en console.groq.com (botón API Keys), sin tarjeta. Tu key se guarda cifrada y solo se usa para llamar al proveedor que elegiste."
            : "Tu key se guarda cifrada (AES-256) y solo se usa para llamar al proveedor que elegiste."}
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
