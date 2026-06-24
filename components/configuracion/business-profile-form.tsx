"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings } from "@/app/(app)/configuracion/actions";

export function BusinessProfileForm({
  initialBusiness,
  initialSenderName,
  initialSenderEmail,
  initialSenderPhone,
  initialTone,
}: {
  initialBusiness: string;
  initialSenderName: string;
  initialSenderEmail: string;
  initialSenderPhone: string;
  initialTone: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveSettings([
        { key: "aiBusiness", value: String(form.get("aiBusiness") ?? "") },
        { key: "aiSenderName", value: String(form.get("aiSenderName") ?? "") },
        { key: "aiSenderEmail", value: String(form.get("aiSenderEmail") ?? "") },
        { key: "aiSenderPhone", value: String(form.get("aiSenderPhone") ?? "") },
        { key: "aiTone", value: String(form.get("aiTone") ?? "") },
      ]);
      toast.success("Perfil guardado. Los agentes ya lo usan.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="aiBusiness">Qué vendés / a qué te dedicás</Label>
        <Textarea
          id="aiBusiness"
          name="aiBusiness"
          defaultValue={initialBusiness}
          rows={4}
          placeholder="Ej.: Estudio de diseño web para Pymes. Vendemos sitios y tiendas online llave en mano, desde USD 1.200. Diferencial: entrega en 2 semanas y soporte incluido."
        />
        <p className="text-xs text-muted-foreground">
          Tu propuesta de valor, productos, precios, diferenciales. El
          Calificador lo usa para juzgar el fit y el Redactor para personalizar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="aiSenderName">Tu nombre (firma)</Label>
          <Input
            id="aiSenderName"
            name="aiSenderName"
            defaultValue={initialSenderName}
            placeholder="Ej.: Ezequiel Orazi"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aiSenderPhone">Teléfono</Label>
          <Input
            id="aiSenderPhone"
            name="aiSenderPhone"
            defaultValue={initialSenderPhone}
            placeholder="Ej.: +54 9 11 5555-5555"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aiSenderEmail">Email de contacto</Label>
        <Input
          id="aiSenderEmail"
          name="aiSenderEmail"
          type="email"
          defaultValue={initialSenderEmail}
          placeholder="Ej.: hola@tuempresa.com"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="aiTone">Cómo querés que escriba</Label>
        <Textarea
          id="aiTone"
          name="aiTone"
          defaultValue={initialTone}
          rows={3}
          placeholder="Ej.: Cercano pero profesional, de vos, frases cortas, sin sonar a venta agresiva. Siempre cerrar con una pregunta o próximo paso concreto."
        />
        <p className="text-xs text-muted-foreground">
          Tono, persona (tú/vos/usted), largo, qué evitar. Pisa el estilo por
          defecto del Redactor.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar perfil"}
      </Button>
    </form>
  );
}
