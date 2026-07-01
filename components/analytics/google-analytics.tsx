import Script from "next/script";

// Google Analytics (gtag.js). Solo se carga en producción para no contaminar
// las métricas con tráfico de desarrollo/preview. El ID se puede overridear con
// NEXT_PUBLIC_GA_ID. Los dominios de Google están habilitados en la CSP
// (ver next.config.ts).
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-D468Q0G36P";

export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production" || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
