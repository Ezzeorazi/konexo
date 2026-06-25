# Seguridad — runbook operativo de Konexo

Guía corta de la postura de seguridad y de los pasos que se configuran **fuera del
código** (Vercel, Clerk, Neon). El hardening en código vive en el repo; esto es lo
que hay que tocar en los paneles.

## Aislamiento de datos (ya en código)

Toda la data está scopeada por `userId` de Clerk y es **fail-closed**: sin sesión no
se lee ni se escribe nada. El punto único de identidad es `currentUserId()`
([lib/auth.ts](lib/auth.ts)); en producción, si falta `CLERK_SECRET_KEY` o no hay
sesión, se aborta (no hay fallback a un usuario compartido).

## Checklist de variables de entorno (Vercel)

- [ ] `CLERK_SECRET_KEY` y `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` presentes en **Production
      y Preview**. Sin la secret en prod, la app falla cerrada (no sirve datos).
- [ ] Usar una **instancia Production de Clerk** en producción (no una `*.clerk.accounts.dev`
      de desarrollo). Las instancias dev tienen límites y menos garantías.
- [ ] `DATABASE_URL` de **Preview distinta** a la de producción (que un preview público
      no apunte a la base real).
- [ ] `DATABASE_URL`, `CLERK_SECRET_KEY` y `POSTHOG_API_KEY` solo server-side. Únicamente
      `NEXT_PUBLIC_*` se inlinea en el bundle (y solo lleva valores públicos seguros).

## Bot protection (Clerk)

Activar **Attack Protection / Bot Protection** en el dashboard de Clerk
(_User & Authentication → Attack Protection_): bot sign-up protection y rate limiting
del lado de Clerk. Es un toggle, sin costo.

## Vercel Firewall / WAF (rate limiting + bots)

La mitigación de DDoS (L3/L4/L7) ya está activa por defecto en todos los planes y
**Vercel no factura el tráfico bloqueado**. Falta sumar rate limiting a lo que muta.

Requiere el CLI: `npm i -g vercel` y `vercel link`. Las reglas se **stagean** y las
publicás vos con `vercel firewall publish --yes`.

### 1. Rate limit del endpoint público de captura de emails (prioridad)

`/api/waitlist` es público y sin auth: el principal vector de abuso. Empezá en `log`
(no bloquea, solo registra) para medir el tráfico real:

```bash
vercel firewall rules add "Rate limit waitlist" \
  --condition '{"type":"path","op":"pre","value":"/api/waitlist"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit \
  --rate-limit-window 600 \
  --rate-limit-requests 20 \
  --rate-limit-keys ip \
  --rate-limit-action log \
  --yes
vercel firewall diff            # revisá lo staged
vercel firewall publish --yes   # publicalo vos
```

Tras unos días, revisá el tráfico en el dashboard (`/firewall/traffic?filter=<ruleId>`)
y si solo matchea abuso, cambiá `--rate-limit-action` a `deny` (o `challenge`):

```bash
vercel firewall rules edit "Rate limit waitlist" \
  --condition '{"type":"path","op":"pre","value":"/api/waitlist"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit --rate-limit-window 600 --rate-limit-requests 20 \
  --rate-limit-keys ip --rate-limit-action deny --yes
```

### 2. Rate limit general de /api (red de seguridad)

```bash
vercel firewall rules add "Rate limit API" \
  --condition '{"type":"path","op":"pre","value":"/api"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 100 \
  --rate-limit-keys ip \
  --rate-limit-action log \
  --yes
```

> Las mutaciones de datos (Server Actions) ya están protegidas por la sesión de Clerk;
> el rate limiting acá frena scripts y fuerza bruta, no reemplaza la auth.

### 3. Bot Protection (managed ruleset)

En el dashboard del proyecto → _Firewall_ → activar el **managed ruleset de Bot
Protection** (sin código). Para protección invisible específica del formulario podés
sumar **Vercel BotID** más adelante (requiere el paquete `botid` y `checkBotId()` en el
route handler; lo dejamos como upgrade opcional, no es necesario hoy).

### 4. Attack Challenge Mode (emergencia)

Si hay un ataque activo, **vos** activás Attack Mode (challenge a visitantes no
verificados; los crawlers verificados quedan exentos):

```bash
vercel firewall attack-mode enable --duration 1h --yes
vercel firewall attack-mode disable --yes
```

## Content-Security-Policy

Hay una CSP enforcing en [next.config.ts](next.config.ts), con el host de Clerk
derivado de la publishable key. Si tras un cambio de entorno algo se rompe (login,
asistente), poné `CSP_REPORT_ONLY=1` en Vercel para pasarla a modo reporte (no
bloquea, loguea violaciones en la consola del browser), depurá y volvé a enforcing.

## Backups

`npm run db:backup` (pg_dump fechado en `/backups`) + exportación por usuario en
**Configuración → Mis datos**. Ver el README para correr y restaurar. Confirmá la
ventana de _point-in-time restore_ de Neon en su dashboard según tu plan.

## Reportar una vulnerabilidad

Escribir a ezequiel.orazi90@gmail.com. No abrir un issue público para fallos de
seguridad.
