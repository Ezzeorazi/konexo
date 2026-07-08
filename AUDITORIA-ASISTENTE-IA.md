# Auditoría del asistente de IA de Konexo

> Informe técnico de qué hace la IA hoy, cómo se parametriza, qué puede modificar
> el usuario y qué acceso tiene a la base de datos.
> Fecha: 2026-07-07 · Alcance: rama `main`.

---

## 1. Resumen ejecutivo

- Konexo tiene **6 superficies de IA** más **1 flujo de importación** (este último NO usa el modelo).
- El motor es una capa propia ([lib/ai.ts](lib/ai.ts)) **texto→texto, sin tool calling**: arma un prompt en el servidor, lo manda al proveedor y devuelve texto. **El modelo no ejecuta funciones ni toca la base.**
- **El LLM no tiene acceso directo a la base de datos.** Solo recibe una *foto de texto* del embudo del usuario, armada server-side y **scopeada por usuario + modo activo**.
- **El único camino que escribe en la base desde el chat es la importación de Excel**, y es **código determinista** (no el modelo) que reusa las mismas validaciones que los formularios.
- Soporta 5 proveedores: **Groq** (default), **Ollama** (local), **OpenAI**, **Anthropic**, **Google**. Con Ollama los datos no salen de la máquina; con los demás, el contexto (con datos reales) viaja al proveedor por HTTPS.
- La API key se guarda **cifrada at-rest** (AES-256-GCM).

---

## 2. Qué hace el bot hoy (inventario de superficies)

| # | Superficie | Disparador | Server Action | Motor | Escribe DB |
|---|-----------|-----------|---------------|-------|:---:|
| 1 | **Asistente conversacional** (chat flotante) | El usuario escribe en el chat | `sendChatMessage` · [asistente/actions.ts](app/(app)/asistente/actions.ts) | `generateAiChat` | No |
| 2 | **Equipo de agentes** (Calificador + Redactor) | Botón "Poner el equipo a trabajar" | `runAgents` · [asistente/agent-actions.ts](app/(app)/asistente/agent-actions.ts) | `generateAiChat` ×N | No |
| 3 | **Adaptar CV a un aviso** | Botón en una oportunidad (modo Empleo) | `tailorCv` · [oportunidades/actions.ts](app/(app)/oportunidades/actions.ts) | `generateAiText` | No |
| 4 | **Ponme al día** (catch-up de un proyecto) | Botón en una oportunidad (modo Freelance) | `catchMeUp` · [oportunidades/actions.ts](app/(app)/oportunidades/actions.ts) | `generateAiText` | No |
| 5 | **Revisión diaria** | Dashboard | `dailyReview` · [dashboard/actions.ts](app/(app)/dashboard/actions.ts) | `generateAiText` | No |
| 6 | **Probar conexión** | Botón en Configuración | `testAiConnection` · [configuracion/actions.ts](app/(app)/configuracion/actions.ts) | `generateAiText` | No |
| 7 | **Importar empresas + contactos** (Excel) | Clip 📎 en el chat | `importFromExcel` · [asistente/import-actions.ts](app/(app)/asistente/import-actions.ts) | **Determinista (sin IA)** | **Sí** |

### 2.1 Asistente conversacional
- Un solo agente que responde preguntas sobre el embudo. Su *system prompt* se arma en [buildChatSystemPrompt](app/(app)/asistente/pipeline.ts) e incluye: fecha, modo activo y su vocabulario, etapas, resumen de conteos, distribución por etapa, forecast ponderado, "señales" (follow-ups vencidos, oportunidades sin contacto), lista de oportunidades abiertas (máx. 40) y contactos (máx. 40).
- El historial se recorta a los **últimos 20 mensajes** antes de enviarse.
- Prioriza **gestionar** (resumir, priorizar, próximos pasos), no solo redactar; redacta mensajes solo si se lo piden.

### 2.2 Equipo de agentes
- **Calificador**: prioriza hasta **25** oportunidades abiertas y devuelve JSON (tier hot/warm/cold + score 0-100 + razón + próximo paso).
- **Orquestador**: elige las **3** más calientes.
- **Redactor**: escribe los 3 borradores **en paralelo** (`Promise.all`), devolviendo JSON (canal + asunto + cuerpo).
- El criterio por vertical vive en [lib/agent-playbooks.ts](lib/agent-playbooks.ts) (no editable por el usuario).

### 2.3, 2.4, 2.5 — Acciones puntuales
- **Adaptar CV**: toma el CV guardado + la descripción del aviso y sugiere ajustes (modo Empleo).
- **Ponme al día**: resume estado, tareas y bitácora de un proyecto (modo Freelance).
- **Revisión diaria**: resumen proactivo del día sobre el embudo del modo activo.

### 2.6 Importación por Excel (no es el modelo)
- Parsea la plantilla ([lib/excel-import.ts](lib/excel-import.ts)), deduplica, resuelve `empresa↔contacto` y **da de alta** empresas/contactos con `prisma.*.create`, scopeado a `userId` + modo activo. El LLM **no participa**.

---

## 3. Cómo se parametriza

### 3.1 Configuración del proveedor (por usuario, tabla `Setting`)
Definida en [lib/ai.ts](lib/ai.ts) / [ai-settings-form.tsx](components/configuracion/ai-settings-form.tsx):

| Setting | Qué es | Default |
|---|---|---|
| `aiProvider` | groq · ollama · anthropic · openai · google | `groq` |
| `aiApiKey` | API key del proveedor (**cifrada at-rest**) | — |
| `aiModel` | Modelo (texto libre) | según proveedor (ej. `llama-3.3-70b-versatile`) |
| `aiBaseUrl` | URL de Ollama | `http://localhost:11434` |

### 3.2 Perfil de negocio (por usuario, tabla `Setting`)
Editable en Configuración ([business-profile-form.tsx](components/configuracion/business-profile-form.tsx)). Se inyecta en **todos** los prompts vía `profilePromptBlock`:

| Setting | Uso |
|---|---|
| `aiBusiness` | Qué vende / a qué se dedica (máx. 20.000). El Calificador lo usa para juzgar el *fit*; el Redactor para personalizar. |
| `aiSenderName` / `aiSenderEmail` / `aiSenderPhone` | Firma de los mensajes redactados. |
| `aiTone` | Estilo de redacción — **pisa el tono por defecto**. |

### 3.3 Modo y contexto
- `konexo-track` (cookie): modo activo. `enabledTracks` y `businessName` (Setting).
- **Etapas del embudo** (tabla `PipelineStage`, editables): cambian las etapas y probabilidades que ve la IA en el forecast.
- Todo el CRM (empresas, oportunidades, contactos, touchpoints, tareas, bitácora) alimenta el contexto.

### 3.4 Parámetros fijos en código (no configurables por el usuario)
- `max_tokens`: 2048 (Anthropic). Sin `temperature` explícita (default del proveedor).
- Historial de chat: **últimos 20**. Oportunidades/contactos en contexto: **40** c/u. Calificar: **25**. Redactar: **3**. Touchpoints por oportunidad: **20**. Tareas: **50**.
- *System prompts*, *playbooks* por vertical, y el `INJECTION_GUARD`: **hardcodeados**.

---

## 4. Qué puede modificar el usuario

**Sí puede:**
- Proveedor, modelo, API key y URL de Ollama.
- Perfil de negocio (los 5 campos), incluido el **estilo de redacción** (`aiTone`) que sobreescribe el default.
- Modos habilitados, modo activo y nombre del modo "Tu negocio".
- Etapas del embudo y sus probabilidades (afecta el forecast que ve la IA).
- Todos los datos del CRM, que son el contexto de la IA.

**No puede (por diseño):**
- Los *system prompts*, los *playbooks* por vertical, ni el guard anti-inyección.
- Los límites de contexto/tokens/cantidades.
- Dar al modelo capacidad de **escribir** en la base (no hay tool calling).

---

## 5. Acceso a la base de datos

### 5.1 El modelo NO accede a la base
El LLM nunca consulta ni escribe. Recibe **solo texto** armado por el servidor en `gatherPipeline` + `buildChatSystemPrompt`. No hay function/tool calling.

### 5.2 Qué lee el servidor para armar el contexto (scopeado por usuario)
En [gatherPipeline](app/(app)/asistente/pipeline.ts), todas las queries filtran por `userId` **y** `track` activo:
- `opportunity.findMany` (abiertas, máx. 40) con empresa, contactos, **touchpoints** (20) y **projectTasks** (50).
- `contact.findMany` (máx. 40) con empresa.
- `company.count`, `opportunity.groupBy` (distribución), oportunidades con monto (forecast).
- Settings del perfil de negocio.

Las acciones 3-5 leen además el registro puntual (`findFirst` por `id` + `userId`): el aviso/CV en *Adaptar CV*, el proyecto entero (con notas/tareas) en *Ponme al día* y *Revisión diaria*.

### 5.3 Qué SALE hacia el proveedor de IA
Con un proveedor **en la nube** (Groq/OpenAI/Anthropic/Google), el contexto —que incluye **datos reales**: nombres de contactos, empresas, teléfonos, emails, notas, descripciones de avisos y el **contenido del CV**— viaja a la API del proveedor por HTTPS. Con **Ollama** todo queda en la máquina.

### 5.4 Único camino de escritura (importación)
[importFromExcel](app/(app)/asistente/import-actions.ts): valida (Zod), deduplica por nombre y crea empresas/contactos con `userId` + modo activo. Es **determinista**; el modelo no interviene. Deja un tag de lote en `Company.source` (base para un futuro "deshacer").

### 5.5 Aislamiento multi-tenant y secretos
- `currentUserId()` ([lib/auth.ts](lib/auth.ts)) es **fail-closed en producción**: sin sesión/Clerk, aborta en vez de degradar a un usuario compartido. Toda query se scopea por `userId`.
- API key **cifrada at-rest** con AES-256-GCM ([lib/crypto.ts](lib/crypto.ts), `SETTINGS_ENCRYPTION_KEY`); **enmascarada** en la UI; nunca viaja entera al cliente.

### 5.6 Defensa contra prompt injection
[lib/prompt-safety.ts](lib/prompt-safety.ts): el texto del usuario/terceros se **envuelve** en `<datos_usuario>…</datos_usuario>`, se **trunca**, y el system prompt incluye `INJECTION_GUARD` declarando que ese bloque son datos, no instrucciones. Aplicado en chat, agentes, Adaptar CV, Ponme al día y Revisión diaria.

---

## 6. Observaciones y riesgos (hallazgos)

| # | Severidad | Hallazgo |
|---|---|---|
| O1 | **Media** | **Egreso de PII a la nube.** Con proveedor cloud, se envían contactos, teléfonos, emails, notas y CV al tercero. Parte del copy dice "local-first" / "se guarda en tu SQLite local", pero eso aplica al *almacenamiento* (y solo en self-host); el envío al LLM ocurre igual salvo con Ollama. Conviene aclararlo en la UI de Configuración. |
| O2 | ~~Media~~ **Resuelto** | ~~Sin límites de costo/rate por usuario.~~ **Corrección (2026-07-07): esto ya está implementado** ([lib/ai-usage.ts](lib/ai-usage.ts), Tarea 3; test en `tests/integration/ai-quota.test.ts`). `generateAiChat` ([lib/ai.ts](lib/ai.ts):100) es el único punto de entrada al proveedor y llama a `consumeAiQuota` antes de cada request — cubre las 6 superficies (incluidas las ~4 llamadas por corrida del equipo de agentes) desde un único choke point. Tope: `AI_DAILY_LIMIT` (default 30/día por usuario, override por env), contador atómico en Postgres (`AiUsage`, `UPDATE ... count+1`) verificado bajo concurrencia. **Aplica solo cuando se usa la key compartida del dueño** (`usingServerKey`); con key propia del usuario no hay tope (uso ilimitado, lo paga él). Esta fila estaba desactualizada: el doc nunca se tocó después de implementar Tarea 3. |
| O3 | **Baja** | **Historial del chat en `sessionStorage` en claro** (agregado para que la conversación sobreviva a refrescos). Contiene datos del negocio; es solo del lado del cliente, pero queda en el navegador. |
| O4 | **Baja** | **Inyección best-effort.** El guard mitiga pero no elimina el riesgo de que texto pegado (emails, descripciones) intente manipular al modelo; es una defensa probabilística. |
| O5 | **Baja** | **Truncado silencioso.** Con embudos grandes, el contexto se recorta a 40/25/20 sin avisarle al usuario que la IA no vio todo. |
| O6 | **Baja** | **Sin registro de auditoría** de llamadas a IA (qué se envió, a qué proveedor, cuándo). |
| O7 | **Baja** | **Importación sin "deshacer"** todavía (el tag de lote ya existe para implementarlo). |

**Fortalezas confirmadas:** el modelo no escribe en la base; scope estricto por `userId` + modo; API key cifrada; defensa anti-inyección consistente; opción 100% local (Ollama); auth fail-closed en prod.

---

## 7. Recomendaciones priorizadas

1. **Aclarar en Configuración** qué datos salen a la nube según el proveedor, y destacar Ollama como opción privada (O1).
2. ~~Rate limit / tope de uso por usuario en las Server Actions de IA (O2).~~ **Hecho** — ver O2 arriba.
3. **Aviso de truncado** cuando el embudo supera los límites de contexto (O5).
4. **"Deshacer último lote"** para la importación, usando `Company.source` (O7).
5. (Opcional) **Log mínimo de llamadas a IA** (proveedor, timestamp, acción) para trazabilidad (O6).
