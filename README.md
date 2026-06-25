# Konexo

**Konexo es un CRM multi-vertical que organiza tu trabajo de relación como un pipeline.** La misma estructura — empresa → oportunidad → contacto → interacción — se "viste" para seis objetivos distintos (búsqueda de empleo, ventas, inmobiliaria, freelance, fundraising y reclutamiento), con un asistente y un equipo de agentes de IA que priorizan tu embudo y te escriben los próximos mensajes. Empezás gratis y crece con vos.

---

## Tabla de contenidos

- [Características principales](#características-principales)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Guía de uso](#guía-de-uso)
- [Arquitectura](#arquitectura)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Características principales

- **Un CRM, seis verticales (tracks).** Una misma base de datos (empresa → oportunidad → contacto → interacción) adaptada a búsqueda de empleo, ventas, inmobiliaria, freelance, startup/fundraising y reclutamiento. Cada track trae su propio vocabulario, etapas y métricas.
- **Embudo Kanban editable.** Arrastrá las cards entre etapas (drag & drop). Las etapas no son fijas: se siembran desde presets por vertical y podés editarlas por usuario.
- **Forecast ponderado.** Cada etapa tiene una probabilidad de cierre; los tracks con monto (ventas, inmobiliaria, freelance, fundraising) calculan el valor esperado del pipeline.
- **Asistente de IA conversacional.** Un chat que conoce tu embudo y responde sobre tus oportunidades. Multi-proveedor: Groq, Ollama, Anthropic, OpenAI o Google — configurable por usuario, con tu propia API key.
- **Equipo de agentes de IA.** Un orquestador despierta a un *Calificador* (prioriza tus oportunidades con tier + score) y a un *Redactor* (escribe borradores de contacto listos para enviar, en paralelo).
- **Seguimientos que no se escapan.** Cada oportunidad y contacto guarda su próximo follow-up; los vencidos se marcan y suben de prioridad.
- **Versiones de CV con adaptación por IA** (modo búsqueda de empleo): guardá variantes de tu CV y adaptalas al aviso, comparándolo para sugerir keywords y bullets.
- **Multi-tenancy con Clerk.** Aislamiento real por usuario; toda la data está scopeada por `userId`. Sin keys de Clerk, corre con un usuario-dev local.

---

## Requisitos

- **Node.js 20+**
- **PostgreSQL** — una base local o una gestionada (ej. [Neon](https://neon.tech)). Necesitás la connection string en `DATABASE_URL`.
- **npm** (o pnpm/yarn)

Opcionales:
- **Clerk** — para login real y aislamiento por usuario. Sin sus keys, la app corre con un usuario-dev. ([dashboard.clerk.com](https://dashboard.clerk.com))
- **API key de un proveedor de IA** — para el asistente y el equipo de agentes. La de **Groq** es gratis en [console.groq.com](https://console.groq.com). También sirve Ollama (local), Anthropic, OpenAI o Google. Se carga desde **Configuración** dentro de la app, no en variables de entorno.
- **PostHog** — analítica de producto (opcional).

---

## Instalación

```bash
# 1. Cloná el repo
git clone <url-del-repo> konexo
cd konexo

# 2. Instalá dependencias (genera el cliente de Prisma en postinstall)
npm install

# 3. Configurá las variables de entorno
cp .env.example .env   # en Windows (PowerShell): Copy-Item .env.example .env
#   Editá .env y poné tu DATABASE_URL de PostgreSQL.
#   Clerk y PostHog son opcionales (ver comentarios en el archivo).

# 4. Aplicá las migraciones a la base
npx prisma migrate deploy

# 5. (Opcional) Sembrá datos de ejemplo para recorrer la app
npm run db:seed

# 6. Arrancá el servidor de desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) y listo.

### Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Linter (ESLint) |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:seed` | Siembra datos de ejemplo (abortado si detecta producción) |
| `npm run db:backup` | Genera un dump fechado de la base en `/backups` |

---

## Backups y exportación de datos

Hay dos redes de seguridad para no perder datos:

### 1. Backup completo de la base (operador)

`npm run db:backup` corre `pg_dump` contra la `DATABASE_URL` de tu `.env` y deja un
dump fechado en `backups/konexo-AAAA-MM-DD_HHmmss.sql`. La carpeta `/backups` está
en `.gitignore` (puede contener datos reales).

> **Requisito:** tener `pg_dump` instalado y en el `PATH`. En Windows viene con el
> [instalador de PostgreSQL](https://www.postgresql.org/download/windows/) (client tools).

```bash
npm run db:backup
```

**Restaurar un backup** en una base destino (por ejemplo una base Neon nueva), con
su connection string:

```bash
# Restaura el dump elegido sobre la base destino.
psql "postgresql://USER:PASSWORD@HOST/DB?sslmode=require" -f backups/konexo-AAAA-MM-DD_HHmmss.sql
```

> El dump se genera con `--no-owner --no-privileges`, así que se restaura sin chocar
> con roles que no existan en la base destino. Restaurá siempre sobre una base
> **vacía o de prueba** primero para verificar.

**Sobre los backups automáticos de Neon:** Neon ofrece *point-in-time restore*
gestionado; la ventana depende del plan (el Free suele dar ~24 h, los pagos varios
días). Verificá tu ventana actual en el dashboard de Neon → tu proyecto → *Backups /
History*. `db:backup` es complementario: una copia tuya, fuera de Neon.

### 2. Exportar mis datos a JSON (usuario)

Dentro de la app, en **Configuración → Mis datos**, el botón *Exportar a JSON*
descarga una copia de todos los datos del usuario logueado (empresas, oportunidades,
contactos, seguimientos, CVs y configuración). Está scopeado por `userId`: nunca
incluye datos de otra cuenta.

---

## Guía de uso

1. **Elegí tu track.** Desde la barra lateral seleccioná el modo que estés usando (búsqueda de empleo, ventas, etc.). Cada uno reetiqueta toda la app a tu objetivo.
2. **Cargá el embudo.** Creá empresas, oportunidades y contactos. Movelos entre etapas arrastrando las cards en el tablero Kanban.
3. **Registrá interacciones.** Cada email, llamada o reunión queda como un *touchpoint*, y agendás el próximo follow-up para que nada se enfríe.
4. **Configurá la IA.** En **Configuración** elegí proveedor (Groq es gratis) y pegá tu API key. También definís tu perfil de negocio para que los agentes personalicen los mensajes.
5. **Usá el asistente.** El chat lateral responde sobre tu embudo. En el **Asistente**, el equipo de agentes califica tus oportunidades abiertas y te devuelve borradores de contacto listos para copiar y pegar.

> 💡 Hay una guía de uso pública dentro de la app, en la ruta `/guia`.

---

## Arquitectura

- **Framework:** Next.js 16 (App Router) + React 19, con Server Components y Server Actions.
- **Base de datos:** PostgreSQL vía Prisma 7 (cliente generado en `lib/generated/prisma/`, adaptador `@prisma/adapter-pg`).
- **Auth:** Clerk, con degradación a usuario-dev cuando no hay keys (`lib/auth.ts`, `proxy.ts`).
- **UI:** Tailwind CSS v4 + shadcn / Base UI, estética cómic; Kanban con `@dnd-kit`.
- **IA:** router multi-proveedor (`lib/ai.ts`) y equipo de agentes (`lib/agent-team.ts`).
- **Analítica:** PostHog. **Hosting:** Vercel.

El concepto central son los **tracks** (`lib/tracks.ts`): una misma estructura de datos vestida para cada vertical. Las rutas se separan en zona pública (landing, guía, login) y zona privada `app/(app)/` (el CRM), protegida por `proxy.ts`.

---

## Contribución

Las contribuciones son bienvenidas:

1. Abrí un **Issue** para reportar un bug o proponer una mejora antes de ponerte a codear.
2. Hacé un **fork** y creá una rama descriptiva (`feat/mi-mejora` o `fix/mi-bug`).
3. Asegurate de que `npm run lint` y `npm run build` pasen.
4. Enviá un **Pull Request** explicando el qué y el porqué del cambio.

---

## Licencia

Publicado bajo licencia **MIT**. Consultá el archivo [`LICENSE`](LICENSE) para los términos completos.
