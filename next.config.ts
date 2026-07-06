import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { assertCriticalEnv } from "./lib/env";

// Falla el build si faltan env vars críticas en producción (auditoría H1 /
// Tarea 1). Corre al cargar la config, que es lo primero que ejecuta `next
// build`. En dev es un no-op.
assertCriticalEnv();

// Security headers (auditoría M3 / Prioridad 5). Sin dependencias: se sirven
// desde el propio Next en todas las respuestas.
//
// Dos CSP:
//  - App (estricta): default-src 'self' + Clerk + PostHog. Es la que protege las
//    rutas con datos del usuario.
//  - Landing /home.html (relajada): la landing es HTML estático que usa el Play
//    CDN de Tailwind, Google Fonts y se sirve dentro de un <iframe> same-origin.
//    No tiene datos de usuario, así que se le permite eso sin tocar la CSP de la app.
//
// El host de Clerk se DERIVA de la publishable key (que ya viene en el bundle):
// key dev → *.clerk.accounts.dev, key de producción → clerk.<tu-dominio>. Así la
// misma config sirve en dev y en prod.
//
// Si algo se rompiera, poné CSP_REPORT_ONLY=1: la CSP pasa a "solo reporte"
// (no bloquea, loguea violaciones en la consola) para depurar sin tirar el login.

const isDev = process.env.NODE_ENV !== "production";

/** Host del Frontend API de Clerk, decodificado de la publishable key. "" si no hay. */
function clerkHost(): string {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const b64 = pk.replace(/^pk_(test|live)_/, "");
  if (!b64) return "";
  try {
    return Buffer.from(b64, "base64").toString("utf8").replace(/\$+$/, "");
  } catch {
    return "";
  }
}

function buildCsp({ landing }: { landing: boolean }): string {
  const host = clerkHost();
  const clerk = [
    host ? `https://${host}` : "",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
  ].filter(Boolean);
  const turnstile = "https://challenges.cloudflare.com";
  const clerkTelemetry = "https://clerk-telemetry.com";

  const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const posthog = [
    phHost,
    "https://us-assets.i.posthog.com",
    "https://eu-assets.i.posthog.com",
  ];

  // Google Analytics (gtag.js): el loader viene de googletagmanager y los
  // beacons/eventos van a google-analytics.
  const gaScript = "https://www.googletagmanager.com";
  const gaConnect = [
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
  ];

  // Solo la landing estática: Tailwind Play CDN + Google Fonts.
  const tailwindCdn = "https://cdn.tailwindcss.com";
  const fontsCss = "https://fonts.googleapis.com";
  const fontsFiles = "https://fonts.gstatic.com";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    // 'self' en la landing para que el <iframe> same-origin de /home.html cargue;
    // 'none' en la app (no se embebe en ningún lado).
    "frame-ancestors": [landing ? "'self'" : "'none'"],
    "form-action": ["'self'"],
    // Next inyecta scripts inline (sin nonce) → 'unsafe-inline'. La app no tiene
    // dangerouslySetInnerHTML, así que el riesgo XSS es bajo. El Play CDN de
    // Tailwind necesita 'unsafe-eval' (compila en el browser): solo en la landing.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev || landing ? ["'unsafe-eval'"] : []),
      ...clerk,
      turnstile,
      ...posthog,
      gaScript,
      ...(landing ? [tailwindCdn] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'", ...(landing ? [fontsCss] : [])],
    // cdn.cafecito.app: botón de donación; google-analytics: beacons de GA.
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://img.clerk.com",
      "https://cdn.cafecito.app",
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      ...clerk,
    ],
    "font-src": ["'self'", "data:", ...(landing ? [fontsFiles] : [])],
    "connect-src": [
      "'self'",
      ...clerk,
      clerkTelemetry,
      ...posthog,
      ...gaConnect,
      ...(landing ? [tailwindCdn] : []),
      ...(isDev ? ["ws:"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'", ...clerk, turnstile],
  };

  // Solo en producción: forzar upgrade a HTTPS. En dev (http://localhost) rompería
  // la carga de recursos y el HMR.
  if (!isDev) directives["upgrade-insecure-requests"] = [];

  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

const cspHeaderName =
  process.env.CSP_REPORT_ONLY === "1"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

function securityHeaders({ landing }: { landing: boolean }) {
  return [
    { key: cspHeaderName, value: buildCsp({ landing }) },
    // HTTPS forzado (Vercel siempre sirve por HTTPS; en localhost http se ignora).
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    // SAMEORIGIN en la landing (se enmarca a sí misma); DENY en el resto.
    { key: "X-Frame-Options", value: landing ? "SAMEORIGIN" : "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
  ];
}

const nextConfig: NextConfig = {
  // Permite archivos .md/.mdx como páginas e imports (blog en content/blog).
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  async headers() {
    return [
      // Catch-all con la CSP estricta de la app. (La landing estática /home.html
      // se eliminó: hoy la landing es el Server Component React en /home.)
      { source: "/:path*", headers: securityHeaders({ landing: false }) },
    ];
  },
};

// Plugins como string para compatibilidad con Turbopack (Next 16).
const withMDX = createMDX({
  options: { remarkPlugins: ["remark-gfm"] },
});

export default withMDX(nextConfig);
