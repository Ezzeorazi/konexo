"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Copy, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createCalendarToken,
  resetCalendarToken,
} from "@/app/(app)/calendario/actions";

export function SubscribeCard({ url }: { url: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    startTransition(async () => {
      await createCalendarToken();
      router.refresh();
    });
  }

  function handleReset() {
    if (
      !confirm(
        "¿Generar un enlace nuevo? El enlace anterior dejará de funcionar y tendrás que volver a suscribirte en tu calendario."
      )
    )
      return;
    startTransition(async () => {
      await resetCalendarToken();
      router.refresh();
      toast.success("Enlace regenerado.");
    });
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Enlace copiado.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarPlus className="size-4 text-primary" />
          Suscribir en tu teléfono
        </CardTitle>
        <CardDescription>
          Tus follow-ups aparecen en el calendario del teléfono y se actualizan
          solos. El enlace es secreto: cualquiera que lo tenga puede ver tus
          follow-ups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {url ? (
          <>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 text-xs">
                {url}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="Copiar enlace"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Cómo suscribirte:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium text-foreground">iPhone:</span>{" "}
                  Ajustes → Calendario → Cuentas → Añadir cuenta → Otra → Añadir
                  calendario suscrito, y pegá el enlace. Las alertas del feed
                  funcionan.
                </li>
                <li>
                  <span className="font-medium text-foreground">Android / Google Calendar:</span>{" "}
                  en computadora, Google Calendar → Otros calendarios → Desde
                  URL, y pegá el enlace. Aparece en el teléfono. Ojo: Google
                  muestra los eventos pero no envía notificaciones de calendarios
                  suscriptos por URL.
                </li>
              </ul>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={pending}
              className="text-muted-foreground"
            >
              <RefreshCw className="size-3.5" />
              Regenerar enlace
            </Button>
          </>
        ) : (
          <Button onClick={handleCreate} disabled={pending}>
            <CalendarPlus className="size-4" />
            {pending ? "Generando..." : "Generar enlace de calendario"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
