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
import { createCVVersion } from "@/app/configuracion/actions";

export function CVVersionDialog({
  trigger,
}: {
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCVVersion({
        label: String(form.get("label") ?? ""),
        fileName: String(form.get("fileName") ?? ""),
        notes: String(form.get("notes") ?? ""),
      });
      if (result.ok) {
        toast.success("Versión de CV creada.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva versión de CV</DialogTitle>
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
              placeholder="Ej.: CV Backend 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileName">Nombre de archivo</Label>
            <Input
              id="fileName"
              name="fileName"
              placeholder="Ej.: cv-backend-2026.pdf"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
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
              {pending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
