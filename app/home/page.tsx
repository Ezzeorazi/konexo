import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konexo — Un pipeline, cualquier misión",
  description:
    "El CRM personal local-first para cerrar lo que importa: trabajos, clientes, propiedades, inversores o candidatos. Un mismo motor de pipeline, vestido para tu misión.",
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
