import type { NextConfig } from "next";

// Security headers (auditoría M3 / Prioridad 5). Sin dependencias: se sirven
// desde el propio Next en todas las respuestas.
//
// La CSP es la parte delicada en una app con Clerk + PostHog. Para que no se
// rompa al cambiar de entorno, el host de Clerk se DERIVA de la publishable key
// (que ya viene en el bundle): key dev → host *.clerk.accounts.dev, key de
// producción → clerk.<tu-dominio>. Así la misma config sirve en dev y en prod.
//
// Si algo se rompiera, poné CSP_REPORT_ONLY=1: la CSP pasa a modo "solo reporte"
// (no bloquea, solo loguea violaciones en la consola del browser) para depurar
// sin tirar abajo el login.

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

function buildCsp(): string {
  const host = clerkHost();
  // Hosts de Clerk: el derivado (preciso) + comodines de respaldo para assets,
  // imágenes y la verificación anti-bot (Cloudflare Turnstile).
  const clerk = [
    host ? `https://${host}` : "",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
  ].filter(Boolean);
  const turnstile = "https://challenges.cloudflare.com";
  const clerkTelemetry = "https://clerk-telemetry.com";

  // PostHog (opcional): ingest configurado + hosts de assets (recorder, toolbar).
  const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const posthog = [
    phHost,
    "https://us-assets.i.posthog.com",
    "https://eu-assets.i.posthog.com",
  ];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    // Next inyecta scripts inline para la hidratación (sin nonce) → 'unsafe-inline'.
    // No hay dangerouslySetInnerHTML en la app, así que el riesgo XSS es bajo.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      ...clerk,
      turnstile,
      ...posthog,
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com", ...clerk],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...clerk,
      clerkTelemetry,
      ...posthog,
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

const securityHeaders = [
  { key: cspHeaderName, value: buildCsp() },
  // HTTPS forzado (Vercel siempre sirve por HTTPS; en localhost http se ignora).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
