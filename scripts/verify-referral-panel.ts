// Verificación de desarrollo: empty states del panel "¿Quién puede referirte acá?"
// Crea datos temporales, imprime los ids a verificar y los borra al final con --cleanup.
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
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
  const userId = process.env.DEV_USER_ID ?? "dev-user";
  const company = await prisma.company.create({
    data: { userId, name: "TEMP TestCo" },
  });
  const opp = await prisma.opportunity.create({
    data: { userId, title: "TEMP Verificación Panel", companyId: company.id },
  });
  console.log(`empresaSinContactos=${opp.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
