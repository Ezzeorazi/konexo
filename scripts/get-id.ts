// Helper de desarrollo: imprime el id del primer registro del modelo pedido.
// Uso: npx tsx scripts/get-id.ts company|contact|opportunity
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
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
