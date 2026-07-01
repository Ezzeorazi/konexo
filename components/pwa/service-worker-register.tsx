"use client";

import { useEffect } from "react";

// Registra el service worker (public/sw.js) del lado del cliente. Sin UI:
// solo habilita la instalación de la PWA / TWA. Se monta una vez en el layout
// raíz. Ignora navegadores sin soporte (SSR, iOS viejo, etc.).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Silencioso: si falla el registro, la web sigue funcionando igual.
      });
  }, []);

  return null;
}
