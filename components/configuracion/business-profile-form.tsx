"use client";

import { Label } from "@/components/ui/label";
import { EditableText } from "@/components/editable/editable-text";
import { saveSettings } from "@/app/(app)/configuracion/actions";

// Guarda un solo ajuste al perder el foco. Devuelve el contrato { ok } que
// esperan los componentes <Editable*>.
function saveField(key: string) {
  return (value: string) => saveSettings([{ key, value }]);
}

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
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Qué vendés / a qué te dedicás</Label>
        <div className="rounded-lg border border-input p-1">
          <EditableText
            value={initialBusiness}
            multiline
            maxLength={20000}
            ariaLabel="Editar qué vendés"
            onSave={saveField("aiBusiness")}
            placeholder="Ej.: Estudio de diseño web para Pymes. Vendemos sitios y tiendas online llave en mano, desde USD 1.200. Diferencial: entrega en 2 semanas y soporte incluido."
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Tu propuesta de valor, productos, precios, diferenciales. El
          Calificador lo usa para juzgar el fit y el Redactor para personalizar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tu nombre (firma)</Label>
          <div className="rounded-lg border border-input p-1">
            <EditableText
              value={initialSenderName}
              ariaLabel="Editar nombre (firma)"
              onSave={saveField("aiSenderName")}
              placeholder="Ej.: Ezequiel Orazi"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <div className="rounded-lg border border-input p-1">
            <EditableText
              value={initialSenderPhone}
              ariaLabel="Editar teléfono"
              onSave={saveField("aiSenderPhone")}
              placeholder="Ej.: +54 9 11 5555-5555"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email de contacto</Label>
        <div className="rounded-lg border border-input p-1">
          <EditableText
            value={initialSenderEmail}
            type="email"
            ariaLabel="Editar email de contacto"
            onSave={saveField("aiSenderEmail")}
            placeholder="Ej.: hola@tuempresa.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cómo querés que escriba</Label>
        <div className="rounded-lg border border-input p-1">
          <EditableText
            value={initialTone}
            multiline
            maxLength={20000}
            ariaLabel="Editar cómo querés que escriba"
            onSave={saveField("aiTone")}
            placeholder="Ej.: Cercano pero profesional, de vos, frases cortas, sin sonar a venta agresiva. Siempre cerrar con una pregunta o próximo paso concreto."
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Tono, persona (tú/vos/usted), largo, qué evitar. Pisa el estilo por
          defecto del Redactor.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Se guarda solo: hacé clic en un campo para editarlo y al salir se
        guarda. Los agentes usan los cambios al instante.
      </p>
    </div>
  );
}
