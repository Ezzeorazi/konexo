import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

// Genera el DDL del schema actual UNA sola vez, desde vacío hasta el datamodel
// de Prisma, sin tocar ninguna base (--from-empty). Lo escribimos a un archivo
// que cada test file carga en su PGlite. Como sale del schema (no del historial
// de migraciones), siempre refleja el estado vigente.
export default function setup() {
  const sql = execSync(
    "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
    { encoding: "utf8", cwd: process.cwd() }
  );
  const out = path.join(process.cwd(), "tests/integration/.schema.sql");
  writeFileSync(out, sql, "utf8");
}
