import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bangers, Patrick_Hand } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bangers = Bangers({
  variable: "--font-bangers",
  weight: "400",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base para resolver URLs absolutas (Open Graph, canonical, manifest).
  // Dominio de producción; override con NEXT_PUBLIC_SITE_URL en previews.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://konexo.site"),
  title: "Konexo — Tu búsqueda de empleo, nivel héroe",
  description:
    "CRM personal para organizar tu búsqueda de empleo, ventas o freelance como un pipeline: oportunidades, contactos y follow-ups. IA incluida. Gratis para empezar.",
  applicationName: "Konexo",
  keywords: [
    "CRM personal",
    "búsqueda de empleo",
    "seguimiento de postulaciones",
    "pipeline de ventas",
    "follow-ups",
    "freelance",
  ],
  openGraph: {
    type: "website",
    siteName: "Konexo",
    locale: "es_AR",
    url: "/home",
    title: "Konexo — Tu búsqueda de empleo, nivel héroe",
    description:
      "Organizá tu búsqueda de empleo, ventas o freelance como un pipeline. Con IA incluida. Gratis para empezar.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Konexo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Konexo — Tu búsqueda de empleo, nivel héroe",
    description:
      "Organizá tu búsqueda de empleo, ventas o freelance como un pipeline. Con IA incluida.",
    images: ["/og.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Konexo",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-konexo.webp", type: "image/webp" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon-konexo.webp",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#16110c", // ink — barra de estado en modo standalone
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ClerkProvider solo cuando hay keys: así la app sigue corriendo y compilando
  // en dev sin Clerk (usuario-dev). Va dentro de <body> (recomendación Core 3).
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${bangers.variable} ${patrickHand.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ServiceWorkerRegister />
        {hasClerk ? (
          <ClerkProvider
            afterSignOutUrl="/home"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
          >
            <PostHogProvider>{children}</PostHogProvider>
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
