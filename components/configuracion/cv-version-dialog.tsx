"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCVVersion, updateCVVersion } from "@/app/(app)/configuracion/actions";

type CVVersionData = {
  id: string;
  label: string;
  fileName: string | null;
  content: string | null;
  notes: string | null;
};

export function CVVersionDialog({
  cvVersion,
  trigger,
}: {
  cvVersion?: CVVersionData;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(cvVersion);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      label: String(form.get("label") ?? ""),
      fileName: String(form.get("fileName") ?? ""),
      content: String(form.get("content") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    startTransition(async () => {
      const result = cvVersion
        ? await updateCVVersion(cvVersion.id, input)
        : await createCVVersion(input);
      if (result.ok) {
        toast.success(
          isEdit ? "Versión de CV actualizada." : "Versión de CV creada."
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar versión de CV" : "Nueva versión de CV"}
          </DialogTitle>
          <DialogDescription>
            Registrá cada variante de tu CV para saber cuál mandaste a cada
            oportunidad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Etiqueta *</Label>
            <Input
              id="label"
              name="label"
              required
              defaultValue={cvVersion?.label ?? ""}
              placeholder="Ej.: CV Backend 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileName">Nombre de archivo</Label>
            <Input
              id="fileName"
              name="fileName"
              defaultValue={cvVersion?.fileName ?? ""}
              placeholder="Ej.: cv-backend-2026.pdf"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Contenido del CV (texto)</Label>
            <Textarea
              id="content"
              name="content"
              rows={6}
              className="max-h-48 overflow-y-auto"
              defaultValue={cvVersion?.content ?? ""}
              placeholder="Pegá acá el texto plano de tu CV. Lo usa la IA para adaptarlo a cada oportunidad."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              className="max-h-32 overflow-y-auto"
              defaultValue={cvVersion?.notes ?? ""}
              placeholder="Qué destaca esta versión, para qué tipo de rol sirve..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Guardando..."
                : isEdit
                  ? "Guardar"
                  : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
