"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth } from "@clerk/nextjs";

// Analítica client-side: pageviews (para la retención) + identify del usuario de
// Clerk, usando el MISMO distinct_id (userId) que los eventos server-side, así
// PostHog une la actividad de una persona. Se monta dentro de ClerkProvider.

let initialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  useEffect(() => {
    if (!key || initialized) return;
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false, // lo hacemos manual (App Router)
      capture_pageleave: true,
    });
    initialized = true;
  }, [key]);

  if (!key) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      <PostHogPageview />
      {children}
    </PHProvider>
  );
}

/** Liga la sesión de Clerk al mismo distinct_id que usan los eventos del server. */
function PostHogIdentify() {
  const { isSignedIn, userId } = useAuth();
  useEffect(() => {
    if (isSignedIn && userId) posthog.identify(userId);
    else if (isSignedIn === false) posthog.reset();
  }, [isSignedIn, userId]);
  return null;
}

/** Captura $pageview en cada navegación del App Router. */
function PostHogPageview() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    posthog.capture("$pageview", {
      $current_url: window.location.origin + pathname,
    });
  }, [pathname]);
  return null;
}
