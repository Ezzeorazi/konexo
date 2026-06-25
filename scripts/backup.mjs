// Backup de la base con pg_dump contra la DATABASE_URL (auditoría H2).
// Genera un dump fechado en /backups y lo deja listo para restaurar con psql.
//
// Uso:  npm run db:backup
// Requisito: tener pg_dump instalado (viene con PostgreSQL / sus client tools).
//
// Restaurar (ver README → "Restaurar un backup"):
//   psql "<CONNECTION_STRING_DESTINO>" -f backups/konexo-YYYY-MM-DD_HHmmss.sql

import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cargala en .env antes de hacer el backup.");
  process.exit(1);
}

// Timestamp local legible y seguro para nombre de archivo: 2026-06-25_142300
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
  `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const dir = resolve(process.cwd(), "backups");
mkdirSync(dir, { recursive: true });
const outFile = resolve(dir, `konexo-${stamp}.sql`);

console.log(`Generando backup en backups/konexo-${stamp}.sql ...`);

// --no-owner / --no-privileges: el dump se puede restaurar en otra cuenta (ej.
// una base Neon nueva) sin chocar con roles que no existen ahí.
// La connection string va como argumento posicional (no se imprime en logs).
const result = spawnSync(
  "pg_dump",
  ["--no-owner", "--no-privileges", "-f", outFile, url],
  { stdio: ["ignore", "inherit", "inherit"] }
);

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error(
      "\nNo encontré 'pg_dump'. Instalá las client tools de PostgreSQL y asegurate\n" +
        "de que pg_dump esté en el PATH. En Windows vienen con el instalador de\n" +
        "PostgreSQL (https://www.postgresql.org/download/windows/)."
    );
  } else {
    console.error("Error al correr pg_dump:", result.error.message);
  }
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`pg_dump terminó con código ${result.status}. Backup no generado.`);
  process.exit(result.status ?? 1);
}

console.log(`Backup listo: backups/konexo-${stamp}.sql`);
