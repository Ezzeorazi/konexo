"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageCircle,
  X,
  Send,
  Copy,
  Sparkles,
  Paperclip,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/app/(app)/asistente/actions";
import {
  importFromExcel,
  type ImportSummary,
} from "@/app/(app)/asistente/import-actions";
import type { ChatMessage } from "@/lib/ai";

// La conversación se persiste en sessionStorage para que sobreviva a refrescos
// de datos (router.refresh) y a la navegación entre páginas: el chat vive en el
// layout y, sin esto, cualquier remonte borraría los mensajes.
const STORAGE_KEY = "konexo-chat-v1";

function loadPersisted(): { open: boolean; messages: ChatMessage[] } {
  if (typeof window === "undefined") return { open: false, messages: [] };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { open: false, messages: [] };
    const data = JSON.parse(raw) as { open?: boolean; messages?: ChatMessage[] };
    return {
      open: Boolean(data.open),
      messages: Array.isArray(data.messages) ? data.messages : [],
    };
  } catch {
    return { open: false, messages: [] };
  }
}

function persist(open: boolean, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ open, messages }));
  } catch {
    // sin storage (modo privado, cuota): el chat sigue andando, sin persistir.
  }
}

function summaryToText(s: ImportSummary): string {
  const lines = [
    `Listo, importé tu Excel en el modo ${s.trackLabel}:`,
    `• Empresas: ${s.empresasCreadas} nuevas${
      s.empresasDuplicadas ? `, ${s.empresasDuplicadas} ya existían` : ""
    }`,
    `• Contactos: ${s.contactosCreados} nuevos${
      s.contactosDuplicados ? `, ${s.contactosDuplicados} ya existían` : ""
    }`,
  ];
  if (s.contactosLinkeados || s.contactosSinEmpresa) {
    lines.push(
      `• Vínculos: ${s.contactosLinkeados} linkeados a su empresa${
        s.contactosSinEmpresa ? `, ${s.contactosSinEmpresa} sin empresa` : ""
      }`
    );
  }
  if (s.warnings.length) {
    lines.push("", "Avisos:");
    for (const w of s.warnings.slice(0, 8)) lines.push(`• ${w}`);
    if (s.warnings.length > 8)
      lines.push(`• …y ${s.warnings.length - 8} aviso(s) más`);
  }
  return lines.join("\n");
}

const SUGGESTIONS = [
  "¿Qué follow-ups tengo vencidos y qué les escribo?",
  "Redactame un mensaje de LinkedIn para pedir un referido",
  "¿En qué proceso me conviene enfocarme esta semana?",
];

export function ChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Espejos del estado para leer el valor más fresco dentro de callbacks async
  // y persistir de forma sincrónica antes de cualquier refresh/remonte.
  const openRef = useRef(open);
  const messagesRef = useRef(messages);
  // Mantenemos los espejos sincronizados tras cada commit (no durante el render).
  useEffect(() => {
    openRef.current = open;
    messagesRef.current = messages;
  });

  // Restaurar conversación al montar (después de hidratar, para no romper SSR).
  // Leer sessionStorage en el initializer del useState provocaría desajuste de
  // hidratación (el server no tiene window); hacerlo en un effect de montaje es
  // el patrón correcto para estado que solo existe en el cliente.
  useEffect(() => {
    const p = loadPersisted();
    if (!p.messages.length && !p.open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setMessages(p.messages);
    setOpen(p.open);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Actualiza mensajes y persiste sincrónicamente (sobrevive a router.refresh).
  function saveMessages(next: ChatMessage[]) {
    messagesRef.current = next;
    persist(openRef.current, next);
    setMessages(next);
  }
  function changeOpen(value: boolean) {
    openRef.current = value;
    persist(value, messagesRef.current);
    setOpen(value);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file || pending) return;
    const fd = new FormData();
    fd.set("file", file);
    saveMessages([
      ...messagesRef.current,
      { role: "user", content: `📎 ${file.name}` },
    ]);
    startTransition(async () => {
      const res = await importFromExcel(fd);
      if (res.ok) {
        saveMessages([
          ...messagesRef.current,
          { role: "assistant", content: summaryToText(res.summary) },
        ]);
        toast.success("¡Importación lista! Empresas y contactos cargados.");
        // Refrescamos los datos del server SIN perder el chat (ya persistido).
        router.refresh();
      } else {
        toast.error(res.error, { duration: 10000 });
        saveMessages([
          ...messagesRef.current,
          {
            role: "assistant",
            content: `No pude importar el Excel: ${res.error}`,
          },
        ]);
      }
    });
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, open]);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const prev = messagesRef.current;
    const next: ChatMessage[] = [...prev, { role: "user", content }];
    saveMessages(next);
    setInput("");
    startTransition(async () => {
      const result = await sendChatMessage(next);
      if (result.ok) {
        saveMessages([...next, { role: "assistant", content: result.text }]);
      } else {
        toast.error(result.error, { duration: 10000 });
        // Devolvemos el texto al input para que no se pierda lo escrito.
        saveMessages(prev);
        setInput(content);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado.");
  }

  if (!open) {
    return (
      <Button
        size="icon-lg"
        className="fixed right-5 bottom-5 z-40 size-12 rounded-full shadow-lg"
        onClick={() => changeOpen(true)}
      >
        <MessageCircle className="size-5" />
        <span className="sr-only">Abrir asistente</span>
      </Button>
    );
  }

  return (
    <div className="fixed right-5 bottom-5 z-40 flex h-[min(34rem,calc(100vh-3rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl bg-popover shadow-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-medium">Asistente</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => changeOpen(false)}>
          <X className="size-4" />
          <span className="sr-only">Cerrar</span>
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conozco tus oportunidades y contactos. Te ayudo a redactar
              mensajes, notas y a decidir próximos pasos.
            </p>
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">
                Importar empresas y contactos
              </p>
              <p className="mb-2">
                Descargá la plantilla, completala y subila con el clip 📎. Se
                cargan en el modo activo.
              </p>
              <a
                href="/api/plantilla"
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Download className="size-3.5" />
                Descargar plantilla Excel
              </a>
            </div>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="block w-full rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={i} className="group space-y-1">
                <p className="max-w-[92%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
                  {m.content}
                </p>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleCopy(m.content)}
                >
                  <Copy className="size-3" />
                  Copiar
                </Button>
              </div>
            )
          )
        )}
        {pending ? (
          <p className="text-xs text-muted-foreground">Pensando...</p>
        ) : null}
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={onPickFile}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          title="Importar empresas y contactos desde Excel"
        >
          <Paperclip className="size-4" />
          <span className="sr-only">Adjuntar Excel</span>
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Escribí tu consulta..."
          className="max-h-28 min-h-9 flex-1 overflow-y-auto py-1.5"
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()}>
          <Send className="size-4" />
          <span className="sr-only">Enviar</span>
        </Button>
      </form>
    </div>
  );
}
