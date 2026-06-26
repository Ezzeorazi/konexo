import { buildTemplateWorkbook, TEMPLATE_FILE_NAME } from "@/lib/excel-import";

// Descarga de la plantilla de importación. Se genera al vuelo con el MISMO
// formato que entiende el parser (lib/excel-import), así no se desincronizan.
export const dynamic = "force-dynamic";

export async function GET() {
  const wb = buildTemplateWorkbook();
  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${TEMPLATE_FILE_NAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
