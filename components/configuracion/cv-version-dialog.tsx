"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp } from "lucide-react";
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
import { extractCvFromPdf } from "@/app/(app)/configuracion/cv-actions";
import { AtsIssues } from "@/components/configuracion/ats-issues";
import type { AtsCheck } from "@/lib/cv-ats";

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
  // Contenido y nombre de archivo controlados: el PDF subido los completa.
  const [content, setContent] = useState(cvVersion?.content ?? "");
  const [fileName, setFileName] = useState(cvVersion?.fileName ?? "");
  const [ats, setAts] = useState<AtsCheck | null>(null);
  const [extracting, startExtract] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setContent(cvVersion?.content ?? "");
      setFileName(cvVersion?.fileName ?? "");
      setAts(null);
    }
    setOpen(next);
  }

  function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("El PDF pesa más de 4 MB. Exportalo más liviano.");
      return;
    }
    const data = new FormData();
    data.append("file", file);
    startExtract(async () => {
      const res = await extractCvFromPdf(data);
      if (!res.ok) {
        toast.error(res.error, { duration: 8000 });
        return;
      }
      setContent(res.text);
      setFileName(res.fileName);
      setAts(res.ats);
      toast.success(
        `Leí ${res.pages} página${res.pages === 1 ? "" : "s"}. Revisá el texto antes de guardar.`
      );
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      label: String(form.get("label") ?? ""),
      fileName,
      content,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Ej.: cv-backend-2026.pdf"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="content">Contenido del CV (texto)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handlePdf}
                aria-label="Subir PDF del CV"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={extracting}
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="size-4" />
                {extracting ? "Leyendo PDF..." : "Subir PDF"}
              </Button>
            </div>
            <Textarea
              id="content"
              name="content"
              rows={6}
              className="max-h-48 overflow-y-auto"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Subí tu PDF o pegá acá el texto de tu CV. Lo usa la IA para analizarlo y adaptarlo a cada oportunidad."
            />
            <p className="text-xs text-muted-foreground">
              Del PDF guardamos solo el texto, no el archivo. Es lo mismo que
              lee un ATS: si acá sale roto, al ATS también.
            </p>
            {ats ? <AtsIssues ats={ats} /> : null}
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
