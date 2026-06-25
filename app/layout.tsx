import type { Metadata } from "next";
import { Geist, Geist_Mono, Bangers, Patrick_Hand } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
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
  title: "konexo — Tu búsqueda de empleo, nivel héroe",
  description:
    "CRM local-first para búsqueda de empleo: oportunidades, personas y follow-ups.",
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
