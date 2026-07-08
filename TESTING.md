# Pruebas de Konexo

Suite de pruebas por capas del dashboard/CRM. Antes de esto el proyecto no tenía
ningún test propio ni CI. Hoy hay **234 pruebas** en tres capas más un pipeline
de CI que valida lint, tipos, tests y migraciones.

| Capa | Qué prueba | Nº | Runner | Cómo correr |
|------|------------|----|--------|-------------|
| Unit | Lógica pura, sin DB ni DOM | 149 | Vitest | `npm test` |
| Integración | Server actions + rutas API contra Postgres real | 65 | Vitest + PGlite | `npm run test:integration` |
| E2E / a11y / vitals | La app en un navegador real | 20 | Playwright | `npm run test:e2e` |

Atajos: `npm run test:watch` (unit en watch), `npm run test:all` (unit + integración).

---

## Stack

- **Vitest 3** — runner de unit e integración. Resuelve el alias `@/` con `vite-tsconfig-paths`.
- **PGlite** (`@electric-sql/pglite`) + `pglite-prisma-adapter` — Postgres real en
  proceso (WASM), sin Docker ni servidor. La integración corre contra una base
  de verdad sin tocar Neon.
- **`@electric-sql/pglite-socket`** — expone PGlite como servidor Postgres por TCP
  para que `next dev` y los tests E2E compartan la misma base.
- **Playwright** + **`@axe-core/playwright`** — E2E y accesibilidad en Chromium.

El DDL de la base de test se genera desde `schema.prisma` con
`prisma migrate diff --from-empty --to-schema` (refleja siempre el estado vigente).

---

## Capa 1 · Unit (`tests/lib/`, 149)

Lógica pura, corre en milisegundos.

| Archivo | Cubre |
|---------|-------|
| `validation.test.ts` | Cada schema Zod (largos, enums, formatos de fecha/datetime, email), `.pick` para edición in-context, coerción de probabilidad, y los mensajes en español de `firstZodError`. |
| `dates.test.ts` | Parseo local sin corrimiento de zona, el default de 09:00 en follow-ups, formato relativo/vencido (con fake timers). |
| `excel-import.test.ts` | Parseo de la plantilla, headers desordenados/faltantes, filas vacías, fechas inválidas → warnings, `parseRelationship`, y **round-trip**: la plantilla generada parsea limpia. |
| `ics.test.ts` | RFC 5545: CRLF, evento de día completo vs con hora, escapado de caracteres, plegado de líneas a 75. |
| `tracks.test.ts` | Coherencia de los presets de **todos** los tracks (probabilidades 0-100, keys únicas, una etapa ganada), guards de track, `withBusinessName`. |
| `prompt-safety.test.ts` | `userData` neutraliza intentos de cerrar el tag `<datos_usuario>`, truncado. |
| `utils.test.ts` | `normalizeUrl` y `parseMoney` (formato AR/US, separador de miles, símbolos, negativos). |
| `dashboard.test.ts` | `computeForecast` puro: won/lost/open, probabilidad 0, value null, etapa desconocida. |

---

## Capa 2 · Integración (`tests/integration/`, 65)

Server actions y rutas API contra PGlite, **sin mockear Prisma**. El arnés
(`setup.ts` + `ctx.ts`) redirige el singleton `@/lib/prisma` a una PGlite en
memoria, mockea `@/lib/auth` con un usuario conmutable (para multi-tenancy),
y neutraliza `next/cache`, la analítica y Clerk. Cada test arranca con la base
truncada.

| Archivo | Cubre |
|---------|-------|
| `multitenancy.test.ts` | **La garantía más importante**: ninguna action (editar/patch/mover/borrar) ni `/api/export` cruza datos entre dos usuarios. |
| `opportunities.test.ts` | CRUD, reglas del embudo (APPLIED fija fecha, última etapa limpia el follow-up), validación de etapa contra el track, cascada de borrado (bitácora muere, interacciones sobreviven). |
| `contacts-touchpoints.test.ts` | Normalización, rechazo de ligar un touchpoint a una entidad ajena. |
| `onboarding.test.ts` | Créditos idempotentes (incl. concurrencia) y disparadores desde cada action. |
| `stages.test.ts` | Auto-seed de etapas en la primera lectura, sin duplicar bajo concurrencia. |
| `ai-quota.test.ts` | Tope diario exacto + concurrencia atómica + cuota por usuario. |
| `account.test.ts` | `deleteAccount` borra todo el tenant sin tocar al otro usuario; exige la palabra de confirmación. |
| `api-routes.test.ts` | Waitlist (idempotente, validación), feed .ics (token válido/inexistente/corto). |
| `project-tasks.test.ts` | `completedAt`, propiedad, reordenamiento. |
| `perf.test.ts` | **Escala**: dashboard con 1000 oportunidades / 500 contactos → listas acotadas + totales correctos + <5s; feed .ics con 200 eventos. |

---

## Capa 3 · E2E, accesibilidad y Web Vitals (`tests/e2e/`, 20)

La app corre en `next dev` **sin Clerk** (usuario-dev) contra una PGlite expuesta
por TCP (`db-server.mjs`). Los tests siembran/resetean por TCP con `pg` crudo
(`db.ts`). Playwright orquesta ambos servidores.

| Archivo | Cubre |
|---------|-------|
| `smoke.spec.ts` | Landing, dashboard y tablero cargan. |
| `crm-flow.spec.ts` | Crear empresa/contacto/oportunidad por diálogo; el dashboard refleja follow-ups y el panel "sin contacto". |
| `own-project.spec.ts` | Un proyecto propio lidera con "PRÓXIMO PENDIENTE" (sin "Registrar reunión"); el de cliente sí lidera con reunión. |
| `a11y.spec.ts` | axe (WCAG 2.0 A/AA) sobre 7 páginas: **cero violaciones críticas** + cero violaciones fuera de una allowlist documentada. |
| `web-vitals.spec.ts` | CLS < 0.1 (da 0 en las 3 páginas clave) + LCP como smoke de dev. |

Archivos de apoyo: `db-server.mjs` (PGlite → TCP + health), `db.ts` (seed/reset por TCP).

---

## CI (`.github/workflows/ci.yml`)

Corre en cada push a `main` y en cada PR. Tres jobs:

1. **test** — `lint` + `tsc --noEmit` + unit + integración (PGlite, sin Postgres externo).
2. **e2e** — instala Chromium y corre Playwright (arranca DB + `next dev` solo).
3. **migrations** — servicio `postgres:16`, `prisma migrate deploy` (aplica las
   migraciones en orden) + chequeo de **drift** (`migrate diff --from-config-datasource
   --to-schema --exit-code`). Protege el `vercel-build`.

---

## Fixes que surgieron de las pruebas

Al escribir los tests aparecieron bugs reales; se corrigieron y quedaron fijados:

- **Email validado en crudo** → se recorta antes de validar (`z.preprocess`), así
  espacios alrededor ya no lo rechazan (contactos y `/api/waitlist`).
- **Montos con separador de miles se perdían** → `parseMoney` en `lib/utils.ts`
  entiende formato AR (`1.500,50`) y US (`1,500.50`) → `1500.5`.
- **Etapa sin validar contra el track** → `updateOpportunityStage` y
  `patchOpportunityField` rechazan una etapa fantasma (antes dejaba la card
  invisible en el kanban y el dashboard).
- **11 violaciones críticas de accesibilidad en /configuración** → `aria-label` en
  `StagesEditor` y en el select de proveedor de `AiSettingsForm`. Ahora cero críticos.
- **Lista sin tope en el dashboard** → `noContactOpps` acotada a 20.
- **Lookup del feed .ics sin índice** → `@@index([key])` en `Setting` + migración
  `20260707120000_setting_key_index`.

---

## Tradeoffs documentados (no son bugs a corregir acá)

- **Contraste de color** (a11y, `serious`): el tema "cómic" usa combinaciones de bajo
  contraste a propósito. Mejorarlo es un rediseño de marca; está en la allowlist de `a11y.spec.ts`.
- **`nested-interactive`** (a11y, `serious`): las cards del kanban son *draggables*
  (dnd-kit) que contienen un link. Es inherente al drag & drop.
- **LCP en dev**: `next dev` no representa producción; el test lo trata como smoke.
  Para LCP/TBT reales, correr Lighthouse contra un build/preview.
- **Índice del token**: no se indexa la columna `value` (texto sin tope) por el
  límite de tamaño de entrada de btree; la solución 100% escalable sería una
  columna dedicada para el token.

---

## Notas de arquitectura / gotchas

- **`localhost`, no `127.0.0.1`** en las URLs de Next para E2E: Next 16 dev bloquea
  sus recursos (HMR, chunks) desde orígenes no confiables → la app no hidrata.
- En `next dev` hay que **reintentar abrir diálogos** hasta que el componente
  hidrata (helper `openDialog` con `toPass`).
- El cliente generado de Prisma es CJS: el loader de Playwright no lo carga, por eso
  los E2E usan `pg` crudo en vez de Prisma.
- **Prisma 7** renombró flags de `migrate diff` (`--to-schema-datamodel` →
  `--to-schema`); `--from-migrations` exige `shadowDatabaseUrl`, por eso el drift
  check usa `--from-config-datasource` sobre la DB ya migrada.

---

## Pendientes (futuro)

- `scripts/test-migration.mjs`: restaurar un backup real y correr asserts antes de
  aplicar una data-migration nueva.
- Lighthouse CI contra un preview para métricas de performance reales.
