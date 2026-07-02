import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { pageMetadata } from "@/lib/seo";

// Página PÚBLICA de eliminación de cuenta (Tarea 5). Google Play exige una URL
// accesible que explique cómo borrar la cuenta y los datos; esta URL va en el
// formulario de Data Safety. El borrado real se hace logueado, en Configuración.
export const metadata: Metadata = pageMetadata({
  path: "/eliminar-cuenta",
  title: "Eliminar tu cuenta — Konexo",
  description:
    "Cómo eliminar tu cuenta de Konexo y todos tus datos de forma permanente, y qué información se borra.",
});

const CONTACT_EMAIL = "ezequiel.orazi90@gmail.com";

export default function EliminarCuentaPage() {
  return (
    <LegalShell
      eyebrow="TU CUENTA"
      title="ELIMINAR TU CUENTA"
      updated="1 de julio de 2026"
    >
      <p>
        En Konexo podés eliminar tu cuenta y todos tus datos vos mismo, cuando
        quieras, sin tener que pedírnoslo. Es <b>permanente e irreversible</b>.
      </p>

      <LegalSection title="Cómo eliminarla">
        <ol>
          <li>
            Iniciá sesión en{" "}
            <a href="https://konexo.site/sign-in">konexo.site</a>.
          </li>
          <li>
            Entrá a{" "}
            <Link href="/configuracion">
              <b>Configuración</b>
            </Link>{" "}
            y bajá hasta la sección <b>“Eliminar mi cuenta”</b>.
          </li>
          <li>
            (Opcional pero recomendado) tocá <b>“Exportar mis datos”</b> para
            guardar una copia en JSON antes de borrar.
          </li>
          <li>
            Escribí <b>ELIMINAR</b> para confirmar y presioná{" "}
            <b>“Eliminar definitivamente”</b>.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="Qué se elimina">
        <p>Al eliminar tu cuenta se borra de forma permanente:</p>
        <ul>
          <li>
            Todo tu CRM: empresas, oportunidades, contactos, seguimientos,
            notas, tareas y versiones de CV.
          </li>
          <li>Tu configuración, incluida cualquier API key que hayas cargado.</li>
          <li>
            Tu usuario y credenciales de acceso (gestionados por nuestro
            proveedor de identidad, Clerk).
          </li>
        </ul>
        <p>
          No conservamos copias de tus datos tras el borrado, salvo que una
          obligación legal nos exija retener algo puntual por un plazo acotado.
        </p>
      </LegalSection>

      <LegalSection title="¿No podés acceder a tu cuenta?">
        <p>
          Si no llegás a iniciar sesión, escribinos desde el email de tu cuenta
          a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> pidiendo la
          eliminación y la procesamos en un plazo razonable.
        </p>
      </LegalSection>

      <p>
        Más detalles sobre el tratamiento de tus datos en la{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>
    </LegalShell>
  );
}
