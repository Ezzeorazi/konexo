# konexo

CRM **local-first** para búsqueda de empleo. No es otro tracker de aplicaciones: el objeto central es la **Oportunidad** ligada a **Personas** y **Touchpoints**. Toda la UX empuja dos preguntas:

1. **¿Quién que conozco puede meterme un referido en esta empresa?**
2. **¿Cuándo es el próximo follow-up y con quién?**

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Prisma 7](https://prisma.io) + SQLite (archivo local `prisma/dev.db`)
- [@dnd-kit/core](https://dndkit.com) para el kanban

100% local y gratuito: single-user, sin auth, sin servicios externos. Tus datos nunca salen de tu máquina.

## Setup

```bash
npm install                 # instala deps y genera el client de Prisma (postinstall)
cp .env.example .env        # define DATABASE_URL (ruta de la SQLite local)
npm run db:migrate          # crea la base y aplica migraciones
npm run db:seed             # (opcional) datos de ejemplo
npm run dev                 # http://localhost:3000
```

> En Windows sin `cp`: `Copy-Item .env.example .env`

## Funcionalidades (MVP)

- **Dashboard**: próximos follow-ups (vencidos + 14 días) entre oportunidades y contactos, y resumen del embudo por etapa.
- **Oportunidades**: tablero kanban (Guardada → Aplicada → Entrevista → Oferta → Cerrada) con drag-and-drop persistente. Crear/editar con empresa, prioridad, versión de CV, fechas y descripción del puesto.
- **Detalle de oportunidad**: panel **"¿Quién puede referirte acá?"** con tus contactos de esa empresa ordenados por fuerza de relación y acción directa de pedir referido.
- **Empresas**: CRUD con oportunidades y contactos vinculados.
- **Contactos**: CRUD con fuerza de relación (Frío/Tibio/Fuerte), registro de touchpoints (email, LinkedIn, llamada, reunión, pedido de referido, nota) y timeline.
- **Configuración**: proveedor de IA + API key (BYO-key, guardada solo en la SQLite local) y gestión de versiones de CV.

## Estructura

```
app/                  # rutas (App Router) + Server Actions por dominio
components/           # componentes compartidos y por dominio
components/ui/        # shadcn/ui
lib/prisma.ts         # singleton de PrismaClient (adapter better-sqlite3)
lib/labels.ts         # enums (código en inglés) → labels en español
prisma/schema.prisma  # modelo de datos
prisma/seed.ts        # datos de ejemplo
```

## Roadmap (Fase 2+)

- Tailoring de CV con IA usando la BYO-key
- Analítica de embudo por canal
- Extensión de navegador (clipper de avisos)
- Build desktop con Tauri
- Tier hosted (Supabase/Postgres) en **konexo.work**
