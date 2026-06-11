# konexo

CRM **local-first** para tu búsqueda de empleo.

## ¿Qué es?

konexo es una app que corre 100% en tu máquina para gestionar una búsqueda laboral como lo que realmente es: un proceso de relaciones, no una planilla de aplicaciones. Organizás **oportunidades** en un tablero kanban, pero cada oportunidad vive conectada a las **personas** que conocés y a cada **interacción** (touchpoint) que tuviste con ellas.

## ¿Por qué?

La mayoría de los trackers de búsqueda de empleo te ayudan a contestar "¿a cuántos lugares apliqué?". Esa es la pregunta equivocada: la mayoría de los procesos se destraban por un referido o un seguimiento a tiempo, no por una aplicación más.

konexo está diseñado alrededor de dos preguntas que las demás apps ignoran:

1. **¿Quién que conozco puede meterme un referido en esta empresa?** Cada oportunidad muestra tus contactos en esa empresa, ordenados por fuerza de relación, con un botón para registrar el pedido de referido. Y el dashboard te marca las oportunidades donde todavía no conocés a nadie, para que salgas a buscar ese puente.
2. **¿Cuándo es el próximo follow-up y con quién?** Oportunidades y contactos tienen fecha de próximo seguimiento; los vencidos te esperan en rojo en el dashboard.

## Setup

Necesitás [Node.js](https://nodejs.org) 20 o superior.

```bash
git clone <url-del-repo> konexo
cd konexo
npm install            # instala dependencias y genera el client de Prisma
cp .env.example .env   # en Windows (PowerShell): Copy-Item .env.example .env
npm run db:migrate     # crea la base SQLite y aplica las migraciones
npm run db:seed        # (opcional) carga datos de ejemplo para recorrer la app
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) y listo.

## Todo es local

No hay cuentas, ni servidores, ni telemetría. Toda tu información —oportunidades, contactos, notas y hasta la API key de IA que configures— se guarda en un único archivo SQLite (`prisma/dev.db`) dentro del proyecto. Nada sale de tu máquina. Si querés un backup, copiá ese archivo; si querés empezar de cero, borralo y volvé a correr las migraciones.

## Funcionalidades

- **Dashboard**: follow-ups vencidos y próximos (oportunidades y contactos), oportunidades sin ningún contacto en su empresa, y resumen del embudo por etapa.
- **Oportunidades**: kanban Guardada → Aplicada → Entrevista → Oferta → Cerrada con drag-and-drop persistente. Cada una con empresa, prioridad, rango salarial, descripción del aviso y versión de CV enviada.
- **Detalle de oportunidad**: panel "¿Quién puede referirte acá?" + timeline de interacciones.
- **Empresas** y **Contactos**: CRUD completo. Los contactos tienen fuerza de relación (Frío / Tibio / Fuerte) y un timeline de touchpoints (email, LinkedIn, llamada, reunión, pedido de referido, nota).
- **Configuración**: proveedor de IA y API key (BYO-key, guardada solo en tu SQLite) y versiones de CV.

## Stack

[Next.js](https://nextjs.org) (App Router) · TypeScript · Tailwind CSS · [shadcn/ui](https://ui.shadcn.com) · [Prisma](https://prisma.io) + SQLite · [@dnd-kit](https://dndkit.com)

## Roadmap

- Tailoring de CV con IA usando tu propia API key
- Analítica de embudo por canal
- Extensión de navegador para clipear avisos
- Build desktop con Tauri
- Tier hosted opcional en **konexo.work**
