import { Plus, FileText, Pencil, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { getSettingsMap } from "@/lib/settings";
import { deleteCVVersion } from "@/app/(app)/configuracion/actions";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiSettingsForm } from "@/components/configuracion/ai-settings-form";
import { hasServerDefaultAi } from "@/lib/ai";
import { BusinessProfileForm } from "@/components/configuracion/business-profile-form";
import { TracksSettingsForm } from "@/components/configuracion/tracks-settings-form";
import { StagesEditor } from "@/components/configuracion/stages-editor";
import { CVVersionDialog } from "@/components/configuracion/cv-version-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDate } from "@/lib/dates";
import { getEnabledTracks } from "@/lib/active-track";
import { getTrackStagesFull } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const userId = await currentUserId();
  const [settingsMap, cvVersions, enabledTracks] = await Promise.all([
    getSettingsMap([
      "aiBusiness",
      "aiSenderName",
      "aiSenderEmail",
      "aiSenderPhone",
      "aiTone",
      "aiProvider",
      "aiApiKey",
      "aiModel",
      "aiBaseUrl",
    ]),
    prisma.cVVersion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { opportunities: true } } },
    }),
    getEnabledTracks(),
  ]);

  const stagesByTrack = await Promise.all(
    enabledTracks.map(async (track) => ({
      track,
      stages: await getTrackStagesFull(track),
    }))
  );

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Para qué usás Konexo, proveedor de IA y versiones de tu CV."
      />

      <Card className="mb-6 h-fit">
        <CardHeader>
          <CardTitle className="text-base">¿Para qué usás Konexo?</CardTitle>
          <CardDescription>
            Elegí uno o ambos modos. Cambia el vocabulario, las etapas del
            embudo y el tablero según para qué lo uses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TracksSettingsForm initialEnabled={enabledTracks} />
        </CardContent>
      </Card>

      <Card className="mb-6 h-fit">
        <CardHeader>
          <CardTitle className="text-base">Etapas del embudo</CardTitle>
          <CardDescription>
            Renombrá, reordená, agregá o borrá las etapas de cada modo. Marcá la
            etapa final como Ganada o Perdida; la probabilidad alimenta el
            forecast.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          {stagesByTrack.map(({ track, stages }) => (
            <StagesEditor key={track} track={track} stages={stages} />
          ))}
        </CardContent>
      </Card>

      <Card className="mb-6 h-fit">
        <CardHeader>
          <CardTitle className="text-base">Perfil de negocio y remitente</CardTitle>
          <CardDescription>
            Contale a los agentes qué vendés, con qué datos firmar y cómo querés
            que escriban. Se usa para calificar mejor el embudo y personalizar
            los borradores del asistente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm
            initialBusiness={settingsMap.get("aiBusiness") ?? ""}
            initialSenderName={settingsMap.get("aiSenderName") ?? ""}
            initialSenderEmail={settingsMap.get("aiSenderEmail") ?? ""}
            initialSenderPhone={settingsMap.get("aiSenderPhone") ?? ""}
            initialTone={settingsMap.get("aiTone") ?? ""}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Inteligencia artificial</CardTitle>
            <CardDescription>
              Konexo ya viene con IA lista para usar. Si querés, podés poner tu
              propio proveedor y API key (o correr Ollama gratis en tu máquina).
              Se usa para adaptar tu CV y redactar mensajes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiSettingsForm
              hasServerDefault={hasServerDefaultAi()}
              userHasKey={Boolean(settingsMap.get("aiApiKey"))}
              initialProvider={settingsMap.get("aiProvider") ?? "groq"}
              initialApiKey={settingsMap.get("aiApiKey") ?? ""}
              initialModel={settingsMap.get("aiModel") ?? ""}
              initialBaseUrl={
                settingsMap.get("aiBaseUrl") ?? "http://localhost:11434"
              }
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
                    <div className="flex items-center gap-1">
                      <CVVersionDialog
                        cvVersion={cv}
                        trigger={
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        }
                      />
                      <ConfirmDeleteButton
                        action={deleteCVVersion.bind(null, cv.id)}
                        title="¿Eliminar esta versión de CV?"
                        description="Las oportunidades que la usaban quedan sin versión asignada."
                        successMessage="Versión de CV eliminada."
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 h-fit">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Mis datos</CardTitle>
              <CardDescription className="mt-1.5">
                Descargá una copia de todo lo tuyo (empresas, oportunidades,
                contactos, seguimientos, CVs y configuración) en un único archivo
                JSON. Es tuyo: guardalo donde quieras como respaldo.
              </CardDescription>
            </div>
            <a
              href="/api/export"
              download
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="size-4" />
              Exportar a JSON
            </a>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
