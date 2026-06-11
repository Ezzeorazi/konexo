// Verificación de desarrollo: empty states del panel "¿Quién puede referirte acá?"
// Crea datos temporales, imprime los ids a verificar y los borra al final con --cleanup.
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

async function main() {
  if (process.argv[2] === "--cleanup") {
    await prisma.opportunity.deleteMany({
      where: { title: "TEMP Verificación Panel" },
    });
    await prisma.company.deleteMany({ where: { name: "TEMP TestCo" } });
    console.log("limpieza OK");
    return;
  }

  // Caso A: oportunidad sin empresa
  const noCompany = await prisma.opportunity.findFirst({
    where: { companyId: null },
  });
  console.log(`sinEmpresa=${noCompany?.id ?? "NINGUNA"}`);

  // Caso B: empresa sin contactos
  const company = await prisma.company.create({
    data: { name: "TEMP TestCo" },
  });
  const opp = await prisma.opportunity.create({
    data: { title: "TEMP Verificación Panel", companyId: company.id },
  });
  console.log(`empresaSinContactos=${opp.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
