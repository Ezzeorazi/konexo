# Konexo

**Konexo es un CRM personal que organiza tu trabajo de relación como un pipeline.** La misma estructura — empresa/cliente → oportunidad → contacto → interacción — se adapta a **dos modos**: **Búsqueda laboral** y **Tu negocio** (freelance / emprendimiento, con nombre personalizable). Trae un **asistente y un equipo de agentes de IA** que *gestionan* tu embudo —resúmenes, próximos pasos y, cuando lo pedís, los mensajes—, **importación de tu cartera desde Excel**, y un **calendario** que sincronizás con el teléfono para no perder ningún follow-up. Empezás gratis y crece con vos.

---

## Tabla de contenidos

- [Los dos modos](#los-dos-modos)
- [Características principales](#características-principales)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Backups y exportación de datos](#backups-y-exportación-de-datos)
- [Guía de uso](#guía-de-uso)
- [Arquitectura](#arquitectura)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Los dos modos

Konexo se ofrece en **dos modos** sobre la misma base de datos. Cada uno reetiqueta la app (vocabulario, etapas, métricas) a tu objetivo; podés activar uno o los dos y cambiar de pipeline con un selector arriba.

| | 🎯 **Búsqueda laboral** | 🧑‍💻 **Tu negocio** (freelance / emprendimiento) |
|---|---|---|
| Entidad central | Oportunidades (avisos) | Proyectos (propios o de cliente) |
| "Empresas" se llaman | Empresas | Clientes |
| Etapas | Guardada → Aplicada → Entrevista → Oferta → Cerrada | Consulta → Propuesta → Negociación → En curso → Cobrado |
| Monto / forecast | No | Sí (monto del proyecto, forecast ponderado) |
| Ejecución | — | Tareas + bitácora por proyecto |
| Extra de IA | Adaptar el CV al aviso | "Ponme al día" de un proyecto |

> **Nombre personalizable:** "Tu negocio" toma el nombre que le pongas en Configuración (ej. el de tu emprendimiento); vacío queda como "Tu negocio".
>
> Internamente existen otros presets de vertical (inmobiliaria, fundraising, reclutamiento) que **no se ofrecen** hoy: quedan en el código solo para no romper datos históricos.

---

## Características principales

- **Un CRM, dos modos.** Una misma base (empresa/cliente → oportunidad → contacto → interacción) adaptada a búsqueda de empleo y a tu negocio. Cada modo trae su vocabulario, etapas y métricas.
- **Embudo Kanban editable.** Arrastrá las cards entre etapas (drag & drop). Las etapas no son fijas: se siembran desde presets por modo y podés editarlas por usuario.
- **Forecast ponderado.** Cada etapa tiene una probabilidad de cierre; en "Tu negocio" (con monto) se calcula el valor esperado del pipeline.
- **Importar tu cartera desde Excel.** Descargá una plantilla, completala y subila por el chat del asistente (clip 📎): crea **empresas y contactos en bloque**, deduplicando por nombre y vinculando cada contacto a su empresa, en el modo activo. El instructivo de formato viene en la propia plantilla.
- **Asistente de IA que gestiona, no solo redacta.** Un chat que conoce tu embudo real (y el estado de ejecución de tus proyectos): resume, te pone al día, prioriza y decide próximos pasos; redactar mensajes es opt-in. Multi-proveedor: Groq, Ollama, Anthropic, OpenAI o Google — configurable por usuario, con tu propia API key. La conversación se conserva aunque cambies de página.
- **Equipo de agentes de IA.** Un orquestador despierta a un *Calificador* (prioriza tus oportunidades con tier + score) y a un *Redactor* (escribe borradores de contacto listos para enviar, en paralelo).
- **Proyectos propios vs. de cliente** (Tu negocio). Marcás cada proyecto como propio o de cliente, con aspecto distinguible: la IA trata los propios como ejecución (sin outreach) y, en los de cliente, redacta solo si lo pedís. Botón **"Ponme al día"** que resume estado y próximos pasos.
- **Actividad unificada.** Cada oportunidad/proyecto tiene un solo stream de Actividad que combina interacciones (email, llamada, reunión) con la bitácora interna (ideas y avances), más un checklist de tareas.
- **Directorio de contactos compartido.** Los contactos se comparten entre modos, con badge del modo de origen y filtro, para no recargar a la misma persona dos veces.
- **Seguimientos que no se escapan.** Cada oportunidad y contacto guarda su próximo follow-up; los vencidos se marcan y suben de prioridad.
- **Calendario sincronizable con el teléfono.** Página de agenda con tus follow-ups (vencidos y próximos) y un **feed iCalendar** (`/api/calendario/[token]`) autenticado por token secreto: lo suscribís en el calendario del teléfono y se actualiza solo.
- **Foco y cierre del día.** Un **Pomodoro** acoplado al sidebar con sugerencias sobre tus datos reales, y un **"Cierre del día"** en el dashboard: un repaso con IA de lo que avanzaste.
- **Versiones de CV con adaptación por IA** (Búsqueda laboral): guardá variantes de tu CV y adaptalas al aviso, comparándolo para sugerir keywords y bullets.
- **Multi-tenancy con Clerk.** Aislamiento real por usuario; toda la data está scopeada por `userId`. Sin keys de Clerk, corre con un usuario-dev local.

---

## Requisitos

- **Node.js 20+**
- **PostgreSQL** — una base local o gestionada (ej. [Neon](https://neon.tech)). Necesitás la connection string en `DATABASE_URL`.
- **npm** (o pnpm/yarn)

Opcionales:
- **Clerk** — para login real y aislamiento por usuario. Sin sus keys, la app corre con un usuario-dev. ([dashboard.clerk.com](https://dashboard.clerk.com))
- **API key de un proveedor de IA** — para el asistente y el equipo de agentes. La de **Groq** es gratis en [console.groq.com](https://console.groq.com). También sirve Ollama (local), Anthropic, OpenAI o Google. Se carga desde **Configuración** dentro de la app, no en variables de entorno.
- **`SETTINGS_ENCRYPTION_KEY`** — clave de 32 bytes (`openssl rand -base64 32`) para cifrar at-rest las API keys de IA que carga el usuario. Requerida en producción.
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
#   Clerk, PostHog y SETTINGS_ENCRYPTION_KEY son opcionales en dev (ver .env.example).

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

> **Requisito:** `pg_dump` **versión ≥ la del servidor**. Neon corre PostgreSQL 18,
> así que hace falta `pg_dump` 18+ (un `pg_dump` más viejo se niega a dumpear un
> servidor más nuevo). En Windows viene con el
> [instalador de PostgreSQL 18](https://www.postgresql.org/download/windows/).
>
> El script busca `pg_dump` en este orden: variable de entorno `PG_DUMP` → el `PATH`
> → la instalación más nueva en `C:\Program Files\PostgreSQL\<ver>\bin`. Si lo tenés
> en otro lado (ej. binarios sueltos sin instalar el servidor), apuntalo así:
>
> ```bash
> PG_DUMP="C:\\ruta\\a\\pg18\\bin\\pg_dump.exe" npm run db:backup
> ```

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

1. **Elegí tu modo.** En Configuración activás **Búsqueda laboral**, **Tu negocio**, o los dos. Con ambos activos, un selector arriba te deja cambiar de pipeline. A "Tu negocio" podés ponerle el nombre de tu emprendimiento.
2. **Cargá el embudo.** Creá empresas/clientes, oportunidades/proyectos y contactos, o **importá tu cartera desde Excel** por el chat (descargá la plantilla, completala y subila con el clip 📎). Movés las cards entre etapas arrastrando en el tablero Kanban.
3. **Registrá la Actividad.** Cada email, llamada o reunión queda como interacción, y las ideas/avances como bitácora, en un solo stream. Agendás el próximo follow-up para que nada se enfríe.
4. **Configurá la IA.** En **Configuración** elegí proveedor (Groq es gratis) y pegá tu API key (se guarda cifrada). Definí tu perfil de negocio para que los agentes personalicen y firmen los mensajes.
5. **Usá el asistente.** El chat lateral conoce tu embudo: te resume, te pone al día y decide próximos pasos; si le pedís un mensaje, lo redacta. En el **Asistente**, el equipo de agentes califica tus oportunidades abiertas y devuelve borradores listos para copiar y pegar.
6. **Sincronizá el calendario.** En **Calendario** ves tus follow-ups vencidos y próximos, y generás un enlace para suscribir el feed en el calendario del teléfono.

> 💡 Hay una guía de uso pública dentro de la app, en la ruta `/guia`.

---

## Arquitectura

- **Framework:** Next.js 16 (App Router) + React 19, con Server Components y Server Actions.
- **Base de datos:** PostgreSQL vía Prisma 7 (cliente generado en `lib/generated/prisma/`, adaptador `@prisma/adapter-pg`).
- **Auth:** Clerk, con degradación a usuario-dev cuando no hay keys (`lib/auth.ts`, `proxy.ts`). Fail-closed en producción.
- **UI:** Tailwind CSS v4 + shadcn / Base UI, estética cómic; Kanban con `@dnd-kit`.
- **IA:** router multi-proveedor (`lib/ai.ts`) y equipo de agentes (`lib/agent-team.ts`); defensa anti prompt-injection (`lib/prompt-safety.ts`) y API keys cifradas at-rest (`lib/crypto.ts`).
- **Importación:** parser de Excel determinista con `exceljs` (`lib/excel-import.ts`); plantilla descargable en `app/api/plantilla/`.
- **Calendario:** feed iCalendar generado en `lib/ics.ts` y servido por la ruta pública `app/api/calendario/[token]/` (autenticada por token, no por sesión).
- **Analítica:** PostHog. **Hosting:** Vercel.

El concepto central son los **modos/tracks** (`lib/tracks.ts`): una misma estructura de datos vestida para cada objetivo. Hoy se ofrecen dos (`AVAILABLE_TRACKS`); el resto de los presets quedan por compatibilidad. Las rutas se separan en zona pública (landing, guía, login) y zona privada `app/(app)/` (el CRM), protegida por `proxy.ts`.

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
