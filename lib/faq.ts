import type { PostFaq } from "@/lib/blog";

// FAQ general de Konexo. Se usa en la home y en el índice del blog, y alimenta
// el schema FAQPage (rich results en Google). Editá/ampliá libremente.
export const KONEXO_FAQ: PostFaq[] = [
  {
    q: "¿Qué es Konexo?",
    a: "Konexo es un CRM personal para organizar procesos que se ganan con relaciones y seguimiento: búsqueda de empleo, ventas, freelance, inmobiliarias, fundraising o reclutamiento. Manejás oportunidades, contactos y follow-ups como un pipeline, en vez de una planilla.",
  },
  {
    q: "¿Konexo es gratis?",
    a: "Sí, podés empezar gratis y sin tarjeta. Incluye la IA lista para usar. Más adelante puede haber funciones premium, pero el núcleo para organizar tu búsqueda o tus ventas es gratuito.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Konexo funciona en el navegador (web) y también se puede instalar como app en tu celular Android desde el navegador (Menú → Instalar app). Tus datos se sincronizan solos.",
  },
  {
    q: "¿Mis datos están seguros y privados?",
    a: "Sí. Cada usuario ve únicamente sus propios datos, protegidos con login y cifrado en tránsito (HTTPS). Podés exportar toda tu información en JSON cuando quieras desde Configuración.",
  },
  {
    q: "¿Cómo funciona la inteligencia artificial?",
    a: "Konexo trae IA incluida para priorizar tu embudo y redactar follow-ups en tu tono. Viene lista para usar; si preferís, podés conectar tu propia API key o correr un modelo local con Ollama para que nada salga de tu equipo.",
  },
  {
    q: "¿Sirve solo para buscar empleo?",
    a: "No. Nació para la búsqueda de empleo, pero el mismo motor sirve para ventas, freelance, inmobiliarias, startups (fundraising) y reclutamiento. Activás uno o varios modos y cambia el vocabulario y las etapas.",
  },
];
