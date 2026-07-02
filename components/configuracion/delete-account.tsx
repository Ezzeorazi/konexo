"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, TriangleAlert, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteAccount } from "@/app/(app)/configuracion/account-actions";

const CONFIRM_WORD = "ELIMINAR";

// "Zona de peligro": eliminación de cuenta (Tarea 5 · requisito de Google Play).
// Pide escribir ELIMINAR, ofrece exportar antes, y tras borrar hace una
// navegación dura a /home (la sesión de Clerk queda inválida: el usuario ya no
// existe, y cualquier ruta privada redirige al login).
export function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const canDelete = confirm.trim().toUpperCase() === CONFIRM_WORD;

  function handleDelete() {
    if (!canDelete) return;
    startTransition(async () => {
      const res = await deleteAccount(confirm);
      if (!res.ok) {
        toast.error(res.error, { duration: 8000 });
        return;
      }
      toast.success("Cuenta eliminada. Cerrando sesión…");
      // Navegación dura: limpia el estado del cliente y sale del área privada.
      window.location.assign("/home");
    });
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <span>
          Eliminar tu cuenta borra <b>para siempre</b> todos tus datos
          (empresas, oportunidades, contactos, seguimientos, CVs y
          configuración) y cierra tu acceso. Esta acción no se puede deshacer.
        </span>
      </p>

      <a
        href="/api/export"
        download
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Download className="size-4" />
        Exportar mis datos antes
      </a>

      <div>
        <Dialog>
          <DialogTrigger
            render={<Button variant="destructive" size="sm" />}
          >
            <Trash2 className="size-4" />
            Eliminar mi cuenta
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar tu cuenta de Konexo?</DialogTitle>
              <DialogDescription>
                Se borran todos tus datos y tu acceso, sin vuelta atrás. Si
                todavía no exportaste una copia, cerrá esto y hacelo primero.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="confirmDelete">
                Escribí <b>{CONFIRM_WORD}</b> para confirmar
              </Label>
              <Input
                id="confirmDelete"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                autoCapitalize="characters"
              />
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                variant="destructive"
                disabled={!canDelete || pending}
                onClick={handleDelete}
              >
                {pending ? "Eliminando…" : "Eliminar definitivamente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
