"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle, X, Send, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/app/(app)/asistente/actions";
import type { ChatMessage } from "@/lib/ai";

const SUGGESTIONS = [
  "¿Qué follow-ups tengo vencidos y qué les escribo?",
  "Redactame un mensaje de LinkedIn para pedir un referido",
  "¿En qué proceso me conviene enfocarme esta semana?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, open]);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      const result = await sendChatMessage(next);
      if (result.ok) {
        setMessages([...next, { role: "assistant", content: result.text }]);
      } else {
        toast.error(result.error, { duration: 10000 });
        // Devolvemos el texto al input para que no se pierda lo escrito.
        setMessages(messages);
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
        onClick={() => setOpen(true)}
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
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
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
