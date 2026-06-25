// Helper de desarrollo: imprime el id del primer registro del modelo pedido.
// Uso: npx tsx scripts/get-id.ts company|contact|opportunity
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const model = process.argv[2] ?? "company";
  if (model === "company") {
    console.log((await prisma.company.findFirstOrThrow()).id);
  } else if (model === "contact") {
    console.log((await prisma.contact.findFirstOrThrow()).id);
  } else if (model === "opportunity") {
    console.log((await prisma.opportunity.findFirstOrThrow()).id);
  }
}

main().finally(() => prisma.$disconnect());
