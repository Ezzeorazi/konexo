// Service worker mínimo de Konexo.
//
// Objetivo: cumplir el criterio de "installable" de Chrome (manifest válido +
// SW con handler de fetch) para poder instalar la PWA y empaquetarla como TWA.
// NO cachea respuestas: Konexo es un CRM dinámico (datos en vivo, Server
// Actions), así que un caché agresivo mostraría datos viejos. Si más adelante
// se quiere soporte offline real, conviene Serwist (ver guía PWA de Next).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough: dejamos que la red maneje todo, sin caché. La sola presencia de
// este handler es lo que habilita la instalación en Chrome/Android.
self.addEventListener("fetch", () => {});
