# Consolidación del asistente de IA: 6 superficies → 3

> Documento de análisis previo a cualquier cambio de código. Responde los 10
> puntos pedidos, en tres bloques. Nada de esto se ejecutó todavía.
> Fecha: 2026-07-07 · Alcance: rama `main` (working tree con cambios sin commitear
> en `dashboard/page.tsx` y `prisma/schema.prisma`, no relacionados con esto).

---

## Bloque 1 — Contradicciones y limpieza barata

### 1. ¿El rate limit está o no?

**Sí está, y ya corregí [AUDITORIA-ASISTENTE-IA.md](AUDITORIA-ASISTENTE-IA.md)** (hallazgo O2 y la recomendación #2, marcados como resueltos con la explicación).

La auditoría estaba desactualizada, no equivocada por otro motivo: el propio código dice que el rate limit se construyó *en respuesta* a ese mismo hallazgo ("auditoría / Tarea 3", [lib/ai-usage.ts:3](lib/ai-usage.ts#L3)), pero el documento nunca se tocó después de implementarlo. `TESTING.md` sí estaba al día.

**Dónde vive:**
- [lib/ai-usage.ts](lib/ai-usage.ts) — `consumeAiQuota(userId)`: `upsert` atómico en `AiUsage` (`userId` + `day` UTC), incrementa y corta si supera `AI_DAILY_LIMIT` (default 30, override por env `AI_DAILY_LIMIT`).
- Se llama desde **un único choke point**: [lib/ai.ts:100-105](lib/ai.ts#L100-L105), dentro de `generateAiChat`. Como `generateAiText` delega en `generateAiChat` ([lib/ai.ts:85](lib/ai.ts#L85)), **las 6 superficies pasan por acá sin excepción** — incluidas las ~4 llamadas por corrida del equipo de agentes.
- Probado con concurrencia real en `tests/integration/ai-quota.test.ts` (Promise.all de `LIMIT × 3` llamadas, verifica que exactamente `LIMIT` pasen).

**¿A quién aplica?** Solo a la key compartida del dueño (`config.usingServerKey === true`, [lib/ai.ts:100](lib/ai.ts#L100)). Si el usuario cargó su propia API key en Configuración, **no hay tope**: paga y usa lo que quiera. Esto es intencional y está bien documentado en el propio código ([lib/ai-usage.ts:9-10](lib/ai-usage.ts#L9-L10)).

---

### 2. Fósiles de "local-first" / privacidad en copy visible

| # | Archivo:línea | Texto | Visible para | Problema |
|---|---|---|---|---|
| 1 | [app/para/[vertical]/page.tsx:215](app/para/%5Bvertical%5D/page.tsx#L215) | *"Con tu propia API key o con Ollama gratis y local: tus datos no salen de tu máquina."* | **Landing pública**, sección "IA de tu lado" | **El más grave.** Conflating: agrupa "tu propia API key" con "Ollama" como si ambos fueran privados. Es falso — tu propia key de OpenAI/Anthropic/Google/Groq manda igual el contexto a la nube de ese proveedor. Solo Ollama es local. Es una promesa de privacidad incorrecta en la página que más gente ve. |
| 2 | [blog/de-base-de-datos-a-asistente.md:59](blog/de-base-de-datos-a-asistente.md#L59) | *"...un CRM personal local-first (tus datos quedan en tu máquina)"* | Post de blog público | Mismo fósil del prototipo viejo. Cierto solo en self-host + Ollama; con el default (Groq) o cualquier proveedor cloud, no aplica. |
| 3 | [app/(app)/asistente/pipeline.ts:399](app/(app)/asistente/pipeline.ts#L399) | *"Sos el asistente de Konexo, un CRM personal local-first que corre en la máquina del usuario."* | **No es copy de usuario — es el system prompt** que se le manda al LLM en cada mensaje del chat | No lo ve el usuario, pero le miente al modelo sobre sí mismo. Con proveedor cloud, el modelo literalmente no corre "en la máquina del usuario". Inocuo hoy (no hay tool-calling que dependa de esa premisa) pero vale limpiarlo. |
| 4 | [app/(app)/oportunidades/actions.ts:361](app/(app)/oportunidades/actions.ts#L361) | *"Sos el asistente de Konexo, un CRM personal local-first."* (system prompt de "Ponme al día") | Ídem — system prompt, no UI | Mismo fósil, mismo alcance acotado. |

**No encontré** el fósil en `/guia` ni en Configuración: esas dos superficies ya están *bien* redactadas (ver punto 3). El problema está concentrado en la landing (`/para/[vertical]`) y el blog — justo las superficies de marketing, que es donde más pesa que sea preciso.

No los toqué, como pediste. Cuando decidan el matiz exacto, la referencia de copy ya-correcto es [app/privacidad/page.tsx:113-120](app/privacidad/page.tsx#L113-L120) (ver punto 3) — reusaría esa redacción.

---

### 3. Copy actual en Configuración → IA sobre qué sale a la nube

**Hallazgo: el O1 de la auditoría sigue sin resolver, pero es más matizado de lo que suena.** Hay copy específico por proveedor en dos lugares distintos, con calidad desigual:

**a) [components/configuracion/ai-settings-form.tsx:210-217](components/configuracion/ai-settings-form.tsx#L210-L217)** (el formulario real, dentro de la app):
```
Ollama   → "Con Ollama todo corre en tu máquina: ni tu CV ni los avisos salen a internet."
Groq     → "Groq tiene capa gratuita: creá tu key en console.groq.com... Tu key se guarda
            cifrada y solo se usa para llamar al proveedor que elegiste."
Otros    → "Tu key se guarda cifrada (AES-256) y solo se usa para llamar al proveedor
(Anthropic/           que elegiste."
 OpenAI/Google)
```
Ollama tiene una frase de privacidad clara. **Groq y el resto solo hablan de la seguridad de la *key*, no de que tus datos (CV, contactos, notas) viajan a ese proveedor.** Esto es exactamente el hallazgo O1: falta el aviso de egreso de datos, específico por proveedor, en la pantalla donde el usuario realmente elige.

**b) [app/privacidad/page.tsx:113-120](app/privacidad/page.tsx#L113-L120)** (página legal, no la de Configuración) — esta sí está bien redactada y es la que yo tomaría como base:
> "...se envía al proveedor de IA configurado para generar la respuesta. Si usás el proveedor por defecto (Groq), esos textos se procesan en sus servidores. Si preferís que **nada** salga de tu equipo, podés configurar **Ollama** (local) en Configuración."

**c) [app/guia/page.tsx:347-350](app/guia/page.tsx#L347-L350)** también lo dice bien para Groq específicamente, pero es la página de guía, no Configuración.

**Conclusión:** el texto correcto ya existe — está en la guía y en privacidad, no en el formulario donde se decide el proveedor. Recomendaría mover/adaptar la frase de `privacidad/page.tsx` al bloque de `ai-settings-form.tsx`, generalizada a "con cualquier proveedor cloud (Groq, Anthropic, OpenAI, Google) tus datos reales viajan a sus servidores; con Ollama no salen de tu máquina" — no solo mencionar Groq.

---

## Bloque 2 — Datos reales de uso

**No pude conseguir estos datos desde esta sesión, y quiero ser preciso sobre por qué en vez de aproximar con humo.**

- `DATABASE_URL` local apunta a `file:./prisma/dev.db` (SQLite de desarrollo, [.env.example](.env.example)) — no a la base de producción. No tengo credenciales ni acceso de red a la Postgres de prod desde acá.
- Tampoco tengo acceso a la cuenta de PostHog (sin herramienta de consulta ni las keys server-side en este entorno).

**Lo que sí puedo decirte con certeza, mirando el código, es qué instrumentación existe — y qué no:**

**4. Llamadas por superficie / usuarios distintos por superficie → NO SE PUEDE RESPONDER, ni con la DB ni con PostHog:**
- `AiUsage` ([prisma/schema.prisma:231-239](prisma/schema.prisma#L231-L239)) solo guarda `{ userId, day, count }` — un contador agregado por usuario y día, **sin campo de superficie/acción**. Te dice "cuántas llamadas totales hizo el usuario X el día Y", pero no si fueron chat, agentes, Adaptar CV, etc. Esto es exactamente el hallazgo O6 (sin auditoría de llamadas), y confirma que sigue sin resolver.
- PostHog server-side ([lib/analytics.ts](lib/analytics.ts)) solo emite 5 eventos hoy: `activated`, `opportunity_created`, `waitlist_signup`, `mission_completed`, `followup_completed`. **Ninguno cubre IA.** Cero eventos tipo `chat_message_sent`, `agents_run`, `cv_tailored`, `catch_me_up`, `daily_review_run` o `ai_connection_tested`.
- Conclusión: **hoy es imposible saber, ni en prod ni en local, cuánto se usa cada superficie de IA** sin agregar instrumentación primero. Si esto es información crítica para decidir la consolidación, el primer paso barato (una tarde) es instrumentar antes de diseñar — un solo `track(userId, "ai_call", { surface })` justo en el choke point de `generateAiChat` ([lib/ai.ts:100](lib/ai.ts#L100)) te daría, en 2-3 semanas, exactamente el dato que pedís.

**Oportunidades activas promedio por usuario:** esto sí es una query simple de `opportunity.groupBy` sobre `stage: { in: openKeys } ` agrupado por `userId`, pero necesita correr contra la Postgres de prod. Te dejo la query lista si querés correrla vos (o dármela a correr con acceso):
```sql
select "userId", count(*) as open_opps
from "Opportunity"
where stage not in ('WON','LOST') -- o el equivalente closed de cada track
group by "userId"
order by open_opps desc;
```
Sin este dato no puedo confirmar si el truncado a 40 (O5) es teórico o urgente — es una incógnita real, no la estoy evadiendo.

**5. Uso de Pomodoro:** peor aún que "sin logging" — **es estructuralmente no medible hoy**. Pomodoro no es una ruta (no hay `/pomodoro`), vive embebido como panel colapsable dentro del sidebar en *todas* las páginas ([components/sidebar.tsx:130-131](components/sidebar.tsx#L130-L131)), así que ni siquiera un `$pageview` de PostHog lo aislaría. No tiene modelo en Postgres (no persiste nada, [app/(app)/pomodoro-actions.ts](app/(app)/pomodoro-actions.ts) solo lee sugerencias del CRM existente). Sin un evento explícito de "abrí/expandí el panel", el uso real de Pomodoro es un punto ciego total.

---

## Bloque 3 — Diseño de la consolidación

### 6. Riesgos técnicos

**El riesgo real es uno solo, y es concreto: el equipo de agentes devuelve datos estructurados con UI rica que el chat de texto plano no tiene hoy.**

`runAgents()` ([app/(app)/asistente/agent-actions.ts](app/(app)/asistente/agent-actions.ts)) devuelve JSON tipado (`Qualification[]` con tier/score/badge de color, `Draft[]` con botón de copiar por borrador, traza de pasos del orquestador) que [components/asistente/agent-team.tsx](components/asistente/agent-team.tsx) renderiza como cards con badges "CALIENTE/TIBIA/FRÍA", ícono por canal, etc. El chat actual ([components/asistente/chat-widget.tsx](components/asistente/chat-widget.tsx)) solo sabe pintar burbujas de texto plano (`ChatMessage = { role, content }`). Si el LLM del chat intenta *narrar* en texto el resultado del equipo de agentes, perdés: el score numérico como jerarquía visual, el botón de copiar por-borrador individual (hoy tenés que copiar todo el bloque de texto), y la separación clara entre "razón" y "próxima acción".

**"Cierre del día" no tiene este problema** — [components/dashboard/daily-review.tsx](components/dashboard/daily-review.tsx) es un botón que abre un diálogo con texto plano + un botón "Copiar". Es literalmente el mismo formato que ya devuelve una respuesta de chat (`generateAiText` con `whitespace-pre-wrap`). Se absorbe sin fricción.

**Riesgo secundario, no técnico sino de costo:** con la key compartida, cada intent en el chat consume 1 unidad de la cuota diaria igual que hoy — eso no cambia. Pero si el "briefing de bienvenida" (punto 7) se dispara automáticamente sin que el usuario lo pida, hay que decidir si cuenta contra la cuota de 30/día. Yo lo contaría (es una llamada real al proveedor), pero avisá el trade-off: un usuario que abre el chat una vez por día ya gasta 1 de sus 30 antes de escribir una palabra.

**Mi recomendación para no perder la UI rica sin construir un motor de intents:** no le pidas al LLM que *redacte* el resultado del equipo de agentes en texto. Reusá el patrón que el chat ya tiene para la importación de Excel: el clip 📎 dispara una Server Action determinística (`importFromExcel`) y el resultado se inserta como un mensaje especial en el hilo ([components/asistente/chat-widget.tsx:139-159](components/asistente/chat-widget.tsx#L139-L159)). Agregá un botón equivalente ("Priorizar y redactar top 3") que llama a `runAgents()` directo — sin pasar por el LLM conversacional — y renderiza las mismas `QualificationRow`/`DraftCard` (extraídas de `agent-team.tsx` a un componente compartido) como un mensaje "rico" dentro del hilo del chat. Cero riesgo de que el modelo alucine el score o rompa el formato, y conservás el botón de copiar por borrador.

---

### 7. Cómo modelar el "briefing de bienvenida"

De tus tres opciones, ninguna a pelo — mi recomendación es una variante de **(a)**, con un disparador más preciso que "primer mensaje del día":

**Por qué no (c) system-prompt-silencioso solo:** no cumple el objetivo. El usuario pidió que el chat *reciba* con el briefing, es decir, que aparezca un mensaje visible sin que el usuario tenga que preguntar. Si el contexto de agenda solo vive en el system prompt, el usuario tiene que escribir algo primero para que sirva de algo — es exactamente el comportamiento reactivo actual, solo que con mejor contexto.

**Por qué no (b) puro:** un botón sticky es más simple de implementar, pero es fricción extra permanente — exactamente lo que "menos es más" quiere evitar. Es la opción más segura si querés evitar el problema de "detectar el primer open del día" (ver abajo), pero no resuelve la ambición del punto original.

**Mi recomendación — (a) con detección liviana, 100% client-side, sin tocar el schema:**
- El chat ya persiste `{ open, messages }` en `sessionStorage` ([chat-widget.tsx:27](components/asistente/chat-widget.tsx#L27)) — pero `sessionStorage` se borra por pestaña, no sirve para "una vez por día".
- Agregá una segunda clave en **`localStorage`** (sobrevive entre pestañas/sesiones): `konexo-briefing-shown-{YYYY-MM-DD}`.
- Disparador: no en el mount del widget (eso gastaría cuota en cada page load, aunque el usuario nunca abra el chat) — **en el momento en que `changeOpen(true)` se llama por primera vez en el día**. Si la clave de hoy no existe: pedí el briefing (nueva Server Action, ver punto 8) y prependelo como el primer mensaje `assistant` antes de renderizar el estado vacío/sugerencias actuales. Guardá la clave.
- Esto no requiere ninguna migración de datos ni Setting nuevo en Postgres — es el mismo patrón que ya usan para persistencia de UI (sessionStorage), solo con la clave "correcta" (localStorage + fecha) para la semántica de "una vez por día".

---

### 8. Diff propuesto: agenda en `gatherPipeline` / `buildChatSystemPrompt`

Hoy `gatherPipeline` calcula `signals` (solo señales textuales: "hay N follow-ups vencidos") pero no expone una lista estructurada y priorizada de la agenda próxima — cada oportunidad/contacto lleva su propio follow-up inline, sin agregación. El dashboard SÍ tiene esa agregación (`getDashboardData` en [lib/dashboard.ts](lib/dashboard.ts), tipo `FollowUp[]`, próximos 14 días) — la reusaría en vez de duplicarla.

```diff
--- a/app/(app)/asistente/pipeline.ts
+++ b/app/(app)/asistente/pipeline.ts
@@
+import { getUpcomingFollowUps, type FollowUp } from "@/lib/dashboard";
+// ^ extraer de getDashboardData la sub-función que arma oppFollowUps+contactFollowUps
+//   (hoy vive inline ahí); pasa a ser compartida por dashboard Y por el chat.

 export type PipelineData = {
   now: Date;
   track: Track;
   vocab: TrackVocab;
   stages: StageDef[];
   opportunities: PipelineOpportunity[];
   contactLines: string[];
   distribution: string;
   forecastLine: string;
   signals: string[];
+  agenda: FollowUp[]; // próximos 14 días, ordenada por fecha, vencidos incluidos
   counts: { opps: number; companies: number; contacts: number };
   profile: BusinessProfile;
 };

 export async function gatherPipeline(): Promise<PipelineData> {
   ...
-  const [opportunities, contacts, companyCount, stageGroups, valued, profileMap] =
+  const [opportunities, contacts, companyCount, stageGroups, valued, profileMap, agenda] =
     await Promise.all([
       ...,
+      getUpcomingFollowUps({ userId, track }),
     ]);
   ...
-  return { now, track, vocab, stages, opportunities: normalized, contactLines,
-    distribution, forecastLine, signals, counts, profile };
+  return { now, track, vocab, stages, opportunities: normalized, contactLines,
+    distribution, forecastLine, signals, agenda, counts, profile };
 }

 export function buildChatSystemPrompt(data: PipelineData): string {
   ...
   const context = [
     `Fecha de hoy: ${iso(data.now)}`,
     ...
     data.signals.length ? `\nSEÑALES PARA RECOMENDAR:\n- ${data.signals.join("\n- ")}` : "",
+    "",
+    data.agenda.length
+      ? `AGENDA (próximos 14 días, ${data.agenda.length}):\n` +
+        data.agenda
+          .map((f) => `- ${iso(f.date)}${f.date < data.now ? " (VENCIDO)" : ""} · ${f.kind === "opportunity" ? vocab.oppSingular : "contacto"}: ${f.title}${f.subtitle ? ` (${f.subtitle})` : ""}`)
+          .join("\n")
+      : "",
     "",
     `${vocab.oppPlural} activas (${oppLines.length}):`,
     ...
   ].filter(Boolean).join("\n");
```

Y en el system prompt base, un párrafo nuevo que le da permiso al modelo para abrir la conversación proactivamente (para el briefing del punto 7) y para responder a los intents de "priorizame"/"cerrame el día" usando la AGENDA en vez de tener que releer cada oportunidad:

```diff
   return [
     "Sos el asistente de Konexo, un CRM personal...",
     ...
+    "Tenés un bloque AGENDA con los próximos follow-ups (14 días) ya ordenados por fecha y marcados si están vencidos: usalo como fuente principal para priorizar, en vez de recorrer la lista completa de oportunidades.",
+    "Si te piden un briefing o un resumen del día, empezá siempre por los vencidos de AGENDA, después lo próximo a vencer, y cerrá con 1-2 próximos pasos concretos.",
     ...deliveryRules,
```

---

### 9. Tamaño estimado del cambio

Con el enfoque recomendado en el punto 6 (botones-en-el-chat que llaman las Server Actions existentes, en vez de un motor de detección de intents en texto libre — eso último sería mucho más trabajo y más riesgo, lo evitaría para esta primera versión):

**Se borra:**
- `app/(app)/asistente/page.tsx` (la página "Asistente IA")
- `components/dashboard/daily-review.tsx` (el botón+diálogo; la lógica de `dailyReview()` en `dashboard/actions.ts` **no se borra**, se reusa)
- El link "Asistente IA" en `components/sidebar.tsx:51`

**Se modifica:**
- `components/asistente/agent-team.tsx` → se descompone: `QualificationRow`/`DraftCard`/`StepRow` se extraen a un componente compartido (ej. `components/asistente/agent-result.tsx`) para reusar dentro del chat; el resto del archivo (el Card contenedor, el botón "Poner a trabajar") se borra.
- `components/asistente/chat-widget.tsx` — el cambio más grande: nuevos botones de acción ("Priorizar equipo", "Cierre del día") junto al clip 📎 existente, nuevo tipo de mensaje "rico" para renderizar resultados del equipo de agentes, lógica de briefing de apertura (punto 7).
- `app/(app)/asistente/pipeline.ts` — bloque AGENDA (punto 8).
- `lib/dashboard.ts` — extraer `getUpcomingFollowUps` como función compartida (hoy el cálculo vive inline dentro de `getDashboardData`).
- `app/(app)/dashboard/page.tsx` — sacar el uso de `<DailyReviewButton />`.
- Tests: revisar `tests/e2e/*.spec.ts` y lo que exista en `tests/lib/dashboard.test.ts` por si referencian la ruta `/asistente` o el botón "Cierre del día" — no los miré en detalle, pero con una consolidación de UI es lo primero que rompe silenciosamente.

**No se modifica (queda igual, solo cambia quién lo invoca):**
- `lib/agent-team.ts`, `app/(app)/asistente/agent-actions.ts`, `app/(app)/dashboard/actions.ts` (`dailyReview`), `lib/ai.ts`, `lib/ai-usage.ts`.

**Migración de datos:** ninguna. No hay cambios de schema — `AiUsage`, `PipelineStage`, etc. quedan igual. Es puramente una reorganización de UI + un campo nuevo derivado (agenda) que no persiste nada nuevo.

**Tamaño:** ni "una tarde" ni "un fin de semana entero" — yo lo calculo en **un día de trabajo enfocado** (6-9 archivos tocados, la mayoría cableado de UI, más el extract de `getUpcomingFollowUps`), asumiendo que se evita la ruta de detección de intents en texto libre. Si en algún momento quieren que el chat entienda "priorizame" escrito a mano en vez de un botón, eso es una segunda fase con su propio análisis de riesgo (falsos positivos, qué pasa si el usuario dice "priorizame pero no me redactes nada").

---

### 10. Pomodoro

**Recomendación: dejarlo con un TODO de instrumentación, no decidir a ciegas.**

No tengo el dato que pediste (punto 5) porque estructuralmente no existe manera de medirlo hoy — ni fila en DB, ni evento de analítica, ni siquiera aislamiento por ruta. Eliminar o mantener con ese vacío de información sería una apuesta, no una decisión. Como está embebido en el sidebar y no tiene modelo propio en Postgres, tampoco parece estar generando deuda técnica real (no hay migración que revertir si lo sacan después).

El paso barato: agregar un `track(userId, "pomodoro_opened")` en el toggle de expandir/colapsar del panel ([components/pomodoro/pomodoro-widget.tsx](components/pomodoro/pomodoro-widget.tsx)) — mismo mecanismo de una línea que ya usan en `opportunity_created` o `followup_completed`. En 2-3 semanas tenés el dato real y la decisión se vuelve trivial, en vez de una corazonada sobre una feature que quizás se usa mucho o quizás nadie tocó nunca.

---

## Resumen de lo que cambié hoy

- **[AUDITORIA-ASISTENTE-IA.md](AUDITORIA-ASISTENTE-IA.md)**: corregido el hallazgo O2 (rate limit) y la recomendación #2 — estaban desactualizados, no la fuente de verdad era el código y `TESTING.md`.
- Nada más se tocó. Los 4 fósiles de "local-first" (punto 2) siguen ahí, listados pero no editados.

## Actualización (2026-07-07) — decisiones tomadas + Fase A entregada

Las 4 decisiones quedaron así:
1. **Instrumentar primero**, consolidar después con datos. ✔️
2. **Botones en el chat**, sin motor de intents en texto libre. ✔️
3. **Botón sticky**, NO briefing automático (evita gastar cuota sin pedido y mide adopción real). ✔️
4. **Arreglar ya los 3 copys de privacidad**, en commit aparte. ✔️

**Fase A entregada y deployada** (2 commits, push a `main` 2026-07-07):
- `fix(privacy)` (9df8e42): landing, blog y form de Configuración. Resuelve O1.
- `feat(analytics)` (2020565): evento `ai_call` { surface } en el choke point (6 superficies) + `pomodoro_opened` al expandir. Verificación pre-deploy: typecheck, lint, 149 unit + 65 integración en verde.
- Los 2 system prompts fósiles ("local-first" en pipeline.ts:399 y oportunidades/actions.ts:361) siguen SIN tocar — quedan para el commit de consolidación (Fase B).

**Query de opps activas por usuario (corrida en Neon):**
- **1 solo usuario con pipeline activo** (`user_3Fue…`, el owner), **8 opps abiertas**. Máximo = mediana = 8; `usuarios_en_o_sobre_40 = 0`.
- **Consecuencia 1:** el hallazgo **O5 (truncado a 40) es muerto/teórico** — nadie está cerca del tope. Se saca de prioridades.
- **Consecuencia 2:** la población medible es **N=1**. La instrumentación va a medir el uso del propio owner, no un agregado de usuarios. El "ranking por usuarios únicos" que motivaba esperar 2-3 semanas no va a materializarse con N=1.

**Decisión de timing de Fase B (tomada por Claude, el owner delegó):**
- **No** esperar 2-3 semanas. Con N=1 más tiempo no compra evidencia estadística, solo un registro de los propios clics.
- **~1 semana** de uso instrumentado para confirmar patrones y por si aparece un usuario real; después **decidir la consolidación por criterio de producto + uso propio**, no por un agregado inexistente. La 6→3 se justifica sola: menos superficies que mantener para un producto de 1 usuario ES "menos es más".
- El cuello de botella real para tener señal de uso externa es **adquisición**, no medición.
