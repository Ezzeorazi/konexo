import { Client } from "pg";

// Acceso directo a la MISMA PGlite que usa el server de Next (db-server.mjs),
// por TCP. Usamos `pg` crudo (no Prisma): el cliente generado de Prisma es CJS y
// el loader de Playwright no lo puede cargar. Con `pg` alcanza para resetear y
// sembrar. El usuario es "dev-user": el que usa la app sin Clerk (lib/auth.ts).

const DB_URL = "postgresql://postgres:postgres@127.0.0.1:5433/postgres";

export const DEV_USER = "dev-user";

let client: Client | undefined;
async function pg(): Promise<Client> {
  if (!client) {
    client = new Client({ connectionString: DB_URL });
    await client.connect();
  }
  return client;
}

export async function query(sql: string, params: unknown[] = []) {
  return (await pg()).query(sql, params);
}

const TABLES = [
  "Company",
  "Opportunity",
  "Contact",
  "Touchpoint",
  "CVVersion",
  "WaitlistSignup",
  "Setting",
  "ProjectTask",
  "UserProgress",
  "AiUsage",
  "PipelineStage",
];

/** Deja la base vacía (entre tests). */
export async function resetDb(): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(",");
  await query(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
}

// --- Helpers de siembra (SQL crudo; updatedAt no tiene default, lo seteamos) ---

export async function seedCompany(id: string, name: string, userId = DEV_USER) {
  await query(
    `INSERT INTO "Company" (id, "userId", name, track, "updatedAt") VALUES ($1,$2,$3,'jobs',now())`,
    [id, userId, name]
  );
}

export async function seedOpportunity(
  id: string,
  title: string,
  opts: {
    companyId?: string;
    stage?: string;
    nextFollowUpAt?: Date;
    userId?: string;
    track?: string;
    kind?: string;
  } = {}
) {
  await query(
    `INSERT INTO "Opportunity" (id, "userId", title, track, stage, kind, priority, "companyId", "nextFollowUpAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,'MEDIUM',$7,$8,now())`,
    [
      id,
      opts.userId ?? DEV_USER,
      title,
      opts.track ?? "jobs",
      opts.stage ?? "SAVED",
      opts.kind ?? "client",
      opts.companyId ?? null,
      opts.nextFollowUpAt ?? null,
    ]
  );
}

export async function seedContact(
  id: string,
  name: string,
  opts: { companyId?: string; nextFollowUpAt?: Date; userId?: string } = {}
) {
  await query(
    `INSERT INTO "Contact" (id, "userId", name, track, "relationshipStrength", "companyId", "nextFollowUpAt", "updatedAt")
     VALUES ($1,$2,$3,'jobs','WARM',$4,$5,now())`,
    [id, opts.userId ?? DEV_USER, name, opts.companyId ?? null, opts.nextFollowUpAt ?? null]
  );
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = undefined;
  }
}
