import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/privacidad",
  title: "Política de privacidad — Konexo",
  description:
    "Cómo Konexo recolecta, usa y protege tus datos: qué guardamos, con qué servicios los procesamos y cómo ejercer tus derechos.",
});

// Página pública (ver proxy.ts). Requisito para publicar en Google Play.
const CONTACT_EMAIL = "ezequiel.orazi90@gmail.com";

export default function PrivacidadPage() {
  return (
    <LegalShell
      eyebrow="LEGALES"
      title="POLÍTICA DE PRIVACIDAD"
      updated="1 de julio de 2026"
    >
      <p>
        Esta política explica qué datos personales trata <b>Konexo</b>{" "}
        (&quot;Konexo&quot;, &quot;la app&quot;, &quot;nosotros&quot;),
        disponible en <a href="https://konexo.site">konexo.site</a> y como
        aplicación Android, con qué finalidad y con qué terceros. Al crear una
        cuenta o usar Konexo aceptás las prácticas descritas acá.
      </p>

      <LegalSection title="1 · Responsable del tratamiento">
        <p>
          Konexo es operado por su titular. Para cualquier consulta sobre
          privacidad o para ejercer tus derechos, escribí a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="2 · Qué datos recolectamos">
        <ul>
          <li>
            <b>Datos de cuenta.</b> Tu email y nombre, gestionados a través de
            nuestro proveedor de identidad (Clerk). Si iniciás sesión con Google,
            recibimos los datos básicos de perfil que autorizás.
          </li>
          <li>
            <b>Datos que vos cargás (tu CRM).</b> Oportunidades, empresas,
            contactos, interacciones (touchpoints), notas, tareas, versiones de
            CV y la configuración de tu espacio. Vos decidís qué información
            ingresás.
          </li>
          <li>
            <b>Configuración de IA.</b> El proveedor de IA que elijas y, si
            cargás una, tu API key. La key se usa únicamente para llamar al
            proveedor que configuraste.
          </li>
          <li>
            <b>Datos de uso.</b> Métricas de producto y estadísticas del sitio
            (páginas visitadas, eventos de activación) mediante PostHog y Google
            Analytics, para entender cómo se usa la app y mejorarla. Incluye
            datos técnicos como tipo de dispositivo y navegador.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3 · Para qué usamos tus datos">
        <ul>
          <li>Brindarte el servicio: guardar y mostrar tu CRM.</li>
          <li>Autenticarte y mantener tu sesión segura.</li>
          <li>
            Potenciar las funciones de IA (adaptar tu CV, redactar y calificar
            mensajes) cuando las usás.
          </li>
          <li>Enviar los recordatorios y follow-ups que vos configurás.</li>
          <li>Mejorar el producto a partir de métricas de uso agregadas.</li>
        </ul>
        <p>
          No vendemos tus datos ni los usamos para publicidad de terceros.
        </p>
      </LegalSection>

      <LegalSection title="4 · Servicios de terceros (encargados)">
        <p>
          Para operar, Konexo se apoya en proveedores que procesan datos por
          nuestra cuenta:
        </p>
        <ul>
          <li>
            <b>Vercel</b> — hosting y ejecución de la aplicación.
          </li>
          <li>
            <b>Clerk</b> — autenticación y gestión de cuentas.
          </li>
          <li>
            <b>Proveedor de base de datos (PostgreSQL)</b> — almacenamiento de tu
            CRM.
          </li>
          <li>
            <b>PostHog</b> — analítica de producto.
          </li>
          <li>
            <b>Google Analytics</b> — estadísticas de uso del sitio.
          </li>
          <li>
            <b>Proveedores de IA</b> (por defecto Groq; opcionalmente Anthropic,
            OpenAI, Google u Ollama según tu configuración).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5 · Funciones de inteligencia artificial">
        <p>
          Cuando usás una función de IA, el texto necesario para procesar tu
          pedido (por ejemplo, la descripción de un aviso, tu CV o el borrador
          de un mensaje) se envía al proveedor de IA configurado para generar la
          respuesta. Si usás el proveedor por defecto (Groq), esos textos se
          procesan en sus servidores. Si preferís que <b>nada</b> salga de tu
          equipo, podés configurar <b>Ollama</b> (local) en Configuración. No
          uses las funciones de IA para enviar datos que no quieras compartir
          con el proveedor.
        </p>
      </LegalSection>

      <LegalSection title="6 · Conservación y eliminación">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Podés{" "}
          <b>exportar todos tus datos</b> en formato JSON desde{" "}
          <b>Configuración → Mis datos</b> en cualquier momento. Si querés
          eliminar tu cuenta y los datos asociados, escribinos a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> y procederemos
          en un plazo razonable, salvo obligación legal de conservarlos.
        </p>
      </LegalSection>

      <LegalSection title="7 · Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas razonables: cifrado en
          tránsito (HTTPS), aislamiento de los datos por usuario y acceso
          restringido. Ningún sistema es 100% infalible, pero trabajamos para
          proteger tu información.
        </p>
      </LegalSection>

      <LegalSection title="8 · Transferencias internacionales">
        <p>
          Nuestros proveedores pueden procesar datos en servidores ubicados
          fuera de tu país (por ejemplo, en Estados Unidos). Al usar Konexo
          aceptás estas transferencias, sujetas a las garantías de cada
          proveedor.
        </p>
      </LegalSection>

      <LegalSection title="9 · Menores de edad">
        <p>
          Konexo no está dirigido a menores de 16 años y no recolectamos
          conscientemente sus datos. Si creés que un menor nos proporcionó datos,
          contactanos y los eliminaremos.
        </p>
      </LegalSection>

      <LegalSection title="10 · Tus derechos">
        <p>
          Según tu jurisdicción, podés acceder, rectificar, exportar o eliminar
          tus datos, y oponerte a ciertos tratamientos. Para ejercerlos,
          escribinos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="11 · Cookies">
        <p>
          Usamos cookies estrictamente necesarias para mantener tu sesión
          (Clerk) y cookies/identificadores de analítica (PostHog y Google
          Analytics). Podés bloquearlas desde tu navegador, aunque algunas
          funciones pueden dejar de operar correctamente.
        </p>
      </LegalSection>

      <LegalSection title="12 · Cambios en esta política">
        <p>
          Podemos actualizar esta política. Publicaremos la versión vigente en
          esta página con su fecha de actualización. Si los cambios son
          relevantes, procuraremos avisarte.
        </p>
      </LegalSection>

      <LegalSection title="13 · Contacto">
        <p>
          Dudas sobre privacidad:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
