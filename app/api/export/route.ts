import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";

// Exportá MIS datos a JSON (auditoría H2): segunda red de seguridad para el
// usuario, además de los backups del operador. Todo scopeado a currentUserId:
// nunca devuelve filas de otro usuario. El proxy ya exige sesión para /api/export
// (no está en la lista de rutas públicas), así que llegar acá implica estar logueado.

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await currentUserId();

  const [
    companies,
    opportunities,
    contacts,
    touchpoints,
    cvVersions,
    pipelineStages,
    settings,
  ] = await Promise.all([
    prisma.company.findMany({ where: { userId } }),
    prisma.opportunity.findMany({ where: { userId } }),
    prisma.contact.findMany({ where: { userId } }),
    prisma.touchpoint.findMany({ where: { userId } }),
    prisma.cVVersion.findMany({ where: { userId } }),
    prisma.pipelineStage.findMany({ where: { userId } }),
    prisma.setting.findMany({ where: { userId } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    userId,
    data: {
      companies,
      opportunities,
      contacts,
      touchpoints,
      cvVersions,
      pipelineStages,
      settings,
    },
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="konexo-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
