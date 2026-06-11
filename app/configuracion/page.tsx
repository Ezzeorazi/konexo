import { Plus, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteCVVersion } from "@/app/configuracion/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiSettingsForm } from "@/components/configuracion/ai-settings-form";
import { CVVersionDialog } from "@/components/configuracion/cv-version-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const [settings, cvVersions] = await Promise.all([
    prisma.setting.findMany(),
    prisma.cVVersion.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { opportunities: true } } },
    }),
  ]);

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Proveedor de IA y versiones de tu CV."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Inteligencia artificial</CardTitle>
            <CardDescription>
              Traé tu propia API key para las funciones de IA (próximamente:
              tailoring de CV por oportunidad).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiSettingsForm
              initialProvider={settingsMap.get("aiProvider") ?? "anthropic"}
              initialApiKey={settingsMap.get("aiApiKey") ?? ""}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Versiones de CV</CardTitle>
                <CardDescription className="mt-1.5">
                  Cada variante de tu CV, para vincularla a oportunidades.
                </CardDescription>
              </div>
              <CVVersionDialog
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" />
                    Nueva
                  </Button>
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            {cvVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin versiones de CV cargadas todavía.
              </p>
            ) : (
              <ul className="divide-y">
                {cvVersions.map((cv) => (
                  <li
                    key={cv.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{cv.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            cv.fileName,
                            `creada el ${formatDate(cv.createdAt)}`,
                            `${cv._count.opportunities} oportunidad${
                              cv._count.opportunities === 1 ? "" : "es"
                            }`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {cv.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {cv.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <ConfirmDeleteButton
                      action={deleteCVVersion.bind(null, cv.id)}
                      title="¿Eliminar esta versión de CV?"
                      description="Las oportunidades que la usaban quedan sin versión asignada."
                      successMessage="Versión de CV eliminada."
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
