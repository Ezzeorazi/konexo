import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/terminos",
  title: "Términos y condiciones — Konexo",
  description:
    "Las reglas para usar Konexo: cuenta, uso aceptable, propiedad de tus datos, funciones de IA, límites de responsabilidad y más.",
});

// Página pública (ver proxy.ts).
const CONTACT_EMAIL = "ezequiel.orazi90@gmail.com";

export default function TerminosPage() {
  return (
    <LegalShell
      eyebrow="LEGALES"
      title="TÉRMINOS Y CONDICIONES"
      updated="1 de julio de 2026"
    >
      <p>
        Estos términos regulan el uso de <b>Konexo</b>, disponible en{" "}
        <a href="https://konexo.site">konexo.site</a> y como aplicación Android.
        Al crear una cuenta o usar la app, aceptás estos términos. Si no estás de
        acuerdo, no uses el servicio.
      </p>

      <LegalSection title="1 · Qué es Konexo">
        <p>
          Konexo es un CRM personal que te ayuda a organizar oportunidades,
          contactos y seguimientos (follow-ups) para procesos que se ganan con
          relaciones: búsqueda de empleo, ventas, freelance, inmobiliarias,
          fundraising, entre otros. Puede incluir funciones de inteligencia
          artificial.
        </p>
      </LegalSection>

      <LegalSection title="2 · Cuenta y elegibilidad">
        <ul>
          <li>
            Necesitás una cuenta para usar Konexo. Sos responsable de la
            veracidad de tus datos y de la seguridad de tu acceso.
          </li>
          <li>Debés tener al menos 16 años para usar el servicio.</li>
          <li>
            Sos responsable de toda la actividad que ocurra bajo tu cuenta.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3 · Uso aceptable">
        <p>Al usar Konexo, te comprometés a no:</p>
        <ul>
          <li>Violar leyes aplicables o derechos de terceros.</li>
          <li>
            Cargar datos de personas sin una base legítima para tratarlos, ni
            usarlos para spam o acoso.
          </li>
          <li>
            Intentar vulnerar la seguridad, sobrecargar la infraestructura o
            acceder a datos de otros usuarios.
          </li>
          <li>
            Usar la app para actividades ilícitas, engañosas o dañinas.
          </li>
        </ul>
        <p>
          Cuando cargás datos de contactos de terceros, declarás contar con una
          base legítima para hacerlo y sos responsable de ese tratamiento.
        </p>
      </LegalSection>

      <LegalSection title="4 · Tus datos son tuyos">
        <p>
          Conservás la titularidad de toda la información que cargás en Konexo.
          Nos otorgás únicamente la licencia limitada necesaria para operar el
          servicio (almacenar, procesar y mostrarte tus datos). Podés exportar
          todo en JSON desde <b>Configuración → Mis datos</b> cuando quieras. El
          tratamiento de datos personales se rige por nuestra{" "}
          <a href="/privacidad">Política de privacidad</a>.
        </p>
      </LegalSection>

      <LegalSection title="5 · Funciones de inteligencia artificial">
        <p>
          Las funciones de IA generan texto de forma automática y{" "}
          <b>pueden contener errores o imprecisiones</b>. Son una ayuda, no un
          consejo profesional (legal, financiero, laboral, etc.).{" "}
          <b>Revisá siempre</b> los resultados antes de usarlos o enviarlos. Al
          usarlas, tu contenido se procesa según el proveedor de IA que
          configures (ver la Política de privacidad). Sos responsable del uso
          que hagas de los textos generados.
        </p>
      </LegalSection>

      <LegalSection title="6 · Servicios de terceros">
        <p>
          Konexo se apoya en proveedores externos (hosting, autenticación, base
          de datos, analítica y proveedores de IA). No somos responsables por
          fallos, cambios o interrupciones de esos servicios, aunque procuramos
          elegir proveedores confiables.
        </p>
      </LegalSection>

      <LegalSection title="7 · Disponibilidad y planes">
        <p>
          Ofrecemos Konexo &quot;tal cual&quot; y podemos modificar, suspender o
          discontinuar funciones. Algunas prestaciones pueden ser gratuitas hoy y
          cambiar a futuro; si introducimos planes pagos, te lo comunicaremos con
          antelación razonable.
        </p>
      </LegalSection>

      <LegalSection title="8 · Garantías">
        <p>
          El servicio se brinda &quot;tal cual&quot; y &quot;según
          disponibilidad&quot;, sin garantías de ningún tipo, expresas o
          implícitas, incluidas las de comerciabilidad, idoneidad para un fin
          particular o disponibilidad ininterrumpida. No garantizamos que la app
          esté libre de errores o interrupciones.
        </p>
      </LegalSection>

      <LegalSection title="9 · Límite de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, Konexo y su titular no serán
          responsables por daños indirectos, incidentales o consecuentes, ni por
          pérdida de datos, oportunidades o ganancias derivadas del uso o la
          imposibilidad de uso del servicio. Mantené tus propios respaldos (la
          exportación en JSON está siempre disponible).
        </p>
      </LegalSection>

      <LegalSection title="10 · Terminación">
        <p>
          Podés dejar de usar Konexo y solicitar la eliminación de tu cuenta
          cuando quieras. Podemos suspender o cerrar cuentas que incumplan estos
          términos o que representen un riesgo para el servicio o terceros.
        </p>
      </LegalSection>

      <LegalSection title="11 · Cambios en los términos">
        <p>
          Podemos actualizar estos términos. Publicaremos la versión vigente en
          esta página con su fecha. El uso continuado del servicio implica la
          aceptación de los términos actualizados.
        </p>
      </LegalSection>

      <LegalSection title="12 · Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina.
          Cualquier controversia se someterá a los tribunales competentes de
          dicha jurisdicción, sin perjuicio de los derechos que te correspondan
          como consumidor.
        </p>
      </LegalSection>

      <LegalSection title="13 · Contacto">
        <p>
          Consultas:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
