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
import { mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cargala en .env antes de hacer el backup.");
  process.exit(1);
}

// Resuelve el binario de pg_dump. Orden: variable PG_DUMP > pg_dump en el PATH >
// la instalación más nueva en "C:\Program Files\PostgreSQL\<ver>\bin" (Windows).
// IMPORTANTE: pg_dump debe ser >= la versión del servidor (Neon corre PG18+), si
// no se niega a dumpear. Por eso preferimos la versión MÁS ALTA que encontremos.
function resolvePgDump() {
  if (process.env.PG_DUMP) return process.env.PG_DUMP;

  // En Windows, buscá las instalaciones de EDB y elegí la mayor versión.
  if (process.platform === "win32") {
    for (const base of [
      "C:\\Program Files\\PostgreSQL",
      "C:\\Program Files (x86)\\PostgreSQL",
    ]) {
      if (!existsSync(base)) continue;
      const versions = readdirSync(base)
        .map((name) => ({ name, major: parseInt(name, 10) }))
        .filter((v) => Number.isFinite(v.major))
        .sort((a, b) => b.major - a.major);
      for (const v of versions) {
        const candidate = join(base, v.name, "bin", "pg_dump.exe");
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  // Última opción: confiar en que está en el PATH.
  return "pg_dump";
}

const PG_DUMP = resolvePgDump();

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
console.log(`Usando: ${PG_DUMP}`);

// --no-owner / --no-privileges: el dump se puede restaurar en otra cuenta (ej.
// una base Neon nueva) sin chocar con roles que no existen ahí.
// La connection string va como argumento posicional (no se imprime en logs).
const result = spawnSync(
  PG_DUMP,
  ["--no-owner", "--no-privileges", "-f", outFile, url],
  { stdio: ["ignore", "inherit", "inherit"] }
);

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error(
      "\nNo encontré 'pg_dump'. Necesitás las client tools de PostgreSQL, versión\n" +
        ">= la del servidor (este Neon corre PostgreSQL 18, así que hace falta\n" +
        "pg_dump 18+). Tres opciones:\n" +
        "  1. Instalá PostgreSQL 18 (https://www.postgresql.org/download/windows/).\n" +
        "  2. O descargá solo los binarios (sin instalar servidor) y apuntá a ellos\n" +
        "     con la variable PG_DUMP, ej:\n" +
        "       PG_DUMP=\"C:\\\\pg18\\\\bin\\\\pg_dump.exe\" npm run db:backup\n" +
        "  3. O agregá la carpeta bin de pg_dump 18 al PATH."
    );
  } else {
    console.error("Error al correr pg_dump:", result.error.message);
  }
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    `\npg_dump terminó con código ${result.status}. Backup no generado.\n` +
      "Si el error dice 'server version mismatch', tu pg_dump es más viejo que el\n" +
      "servidor (Neon = PG18). Instalá/usá pg_dump 18+ (ver PG_DUMP arriba)."
  );
  process.exit(result.status ?? 1);
}

console.log(`Backup listo: backups/konexo-${stamp}.sql`);
