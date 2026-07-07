// Servidor de base de datos para los E2E: una PGlite en memoria expuesta como
// servidor Postgres por TCP (puerto 5433) para que `next dev` y los tests se
// conecten a la MISMA base. Un endpoint HTTP de salud (5434) le avisa a
// Playwright cuándo está lista. Se apaga solo cuando Playwright mata el proceso.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { execSync } from "node:child_process";
import http from "node:http";

const DB_PORT = 5433;
const HEALTH_PORT = 5434;

// DDL del schema actual (sin conectarse a ninguna base). Mismo mecanismo que la
// suite de integración.
const ddl = execSync(
  "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
  { encoding: "utf8", cwd: process.cwd() }
);

const db = await PGlite.create();
await db.exec(ddl);

const server = new PGLiteSocketServer({
  db,
  port: DB_PORT,
  host: "127.0.0.1",
  // Multiplexor: permite varias conexiones simultáneas (el pool de Prisma abre
  // más de una). PGlite las serializa internamente.
  maxConnections: 20,
});
await server.start();

// Health check para Playwright: 200 cuando la DB ya está sirviendo.
http
  .createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  })
  .listen(HEALTH_PORT, "127.0.0.1");

console.log(`[e2e-db] PGlite en tcp://127.0.0.1:${DB_PORT}, health en :${HEALTH_PORT}`);

async function shutdown() {
  try {
    await server.stop();
    await db.close();
  } finally {
    process.exit(0);
  }
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
