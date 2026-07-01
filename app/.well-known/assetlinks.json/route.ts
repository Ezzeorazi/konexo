// Digital Asset Links para verificar la TWA (app de la Play Store) contra
// konexo.site. Lo pide Android en /.well-known/assetlinks.json sin cookies
// (ruta pública en proxy.ts).
//
// El fingerprint SHA-256 sale al firmar el .aab (Bubblewrap/PWABuilder o, si
// usás Play App Signing, desde Play Console → Integridad de la app). Se setea
// como variable de entorno en Vercel, así no hay que tocar código:
//
//   ANDROID_CERT_FINGERPRINT=AB:CD:12:...:EF   (mayúsculas, separado por ":")
//   ANDROID_PACKAGE_NAME=site.konexo.twa        (opcional, default abajo)
//
// Mientras no exista el fingerprint devuelve [] (JSON válido, sin verificar).

export const dynamic = "force-static";

export function GET() {
  const fingerprint = process.env.ANDROID_CERT_FINGERPRINT;
  const packageName = process.env.ANDROID_PACKAGE_NAME ?? "site.konexo.twa";

  const statements = fingerprint
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: packageName,
            sha256_cert_fingerprints: [fingerprint],
          },
        },
      ]
    : [];

  return Response.json(statements, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
