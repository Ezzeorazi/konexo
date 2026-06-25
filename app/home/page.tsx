import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konexo — Organizá tu búsqueda de empleo como un pipeline",
  description:
    "Konexo organiza tu búsqueda laboral como un pipeline: postulaciones, entrevistas y referidos panel por panel. Nunca más se te escapa un follow-up. Gratis para empezar — y cuando consigas el laburo, crece con vos.",
};

// La landing es el HTML original tal cual (public/home.html), servido a
// pantalla completa para que sea idéntico pixel a pixel. Los botones de CTA
// llevan target="_top" para salir del iframe y entrar a la app.
export default function HomePage() {
  return (
    <iframe
      src="/home.html"
      title="Konexo — landing"
      className="block h-screen w-full border-0"
    />
  );
}
