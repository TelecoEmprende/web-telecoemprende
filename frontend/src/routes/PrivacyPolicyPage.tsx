import { useEffect } from "react";
import { Link } from "react-router-dom";

import { LandingFooter } from "../components/layout/LandingFooter";
import { LandingNav } from "../components/home/LandingNav";

const CONTACTO = "telecoemprende.etsit@upm.es";

/**
 * Página de política de privacidad. Solo en español, como el resto de páginas
 * internas/legales del sitio (ver nota de i18n en translations.ts).
 */
export function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="lp-shell">
      <LandingNav />
      <main>
        <section className="lp-legal">
          <div className="lp-container lp-legal-container">
            <span className="lp-eyebrow">Legal</span>
            <h1 className="lp-heading">Política de privacidad</h1>
            <p className="lp-section-lead">
              Esta política explica qué datos recoge TelecoEmprende cuando envías una
              solicitud de inscripción, para qué los usamos y cuánto tiempo los conservamos.
            </p>

            <h2>Responsable del tratamiento</h2>
            <p>
              TelecoEmprende, club de emprendimiento nacido en la ETSIT-UPM y abierto a toda
              la Universidad Politécnica de Madrid. Puedes contactar con nosotros para
              cualquier duda sobre tus datos en{" "}
              <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
            </p>

            <h2>Qué datos recogemos</h2>
            <p>
              Al enviar el formulario de inscripción recogemos: nombre y apellidos, correo
              institucional UPM, teléfono, escuela y estudios, departamento de interés, la
              dirección IP desde la que se envía la solicitud y el enlace a la carpeta de
              Google Drive donde tú alojas tu CV y tu vídeo de presentación. Ese CV y ese
              vídeo no se suben a nuestros servidores: se quedan en tu propia carpeta de
              Drive, y solo accedemos a ellos a través del enlace que compartes para
              valorar tu candidatura.
            </p>

            <h2>Para qué los usamos</h2>
            <p>
              Únicamente para gestionar y valorar tu solicitud de inscripción: revisar tu
              CV y tu vídeo, contactarte sobre el estado de tu candidatura y organizar la
              selección de cada convocatoria.
            </p>

            <h2>Cuánto tiempo los conservamos</h2>
            <p>
              Una vez finaliza el proceso de selección de la convocatoria a la que te
              apuntas, <strong>eliminamos de nuestra base de datos el enlace a tu CV y a tu
              vídeo</strong>, y dejamos de acceder a esos archivos en tu Drive. También
              eliminamos el resto de metadatos de la solicitud que ya no necesitamos
              (teléfono, dirección IP, departamento elegido, estudios). No conservamos
              copia propia de tu CV ni de tu vídeo en ningún momento: solo el enlace,
              mientras dura la valoración.
            </p>
            <p>
              De todos tus datos, conservamos únicamente tu <strong>nombre y tu correo
              electrónico</strong>, de forma separada del resto de la solicitud, con la
              única finalidad de poder escribirte para contarte futuros eventos y
              convocatorias de TelecoEmprende. Puedes pedirnos en cualquier momento que
              dejemos de hacerlo, sin necesidad de justificarlo, escribiendo a{" "}
              <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
            </p>

            <h2>Con quién compartimos tus datos</h2>
            <p>
              No cedemos tus datos a terceros. El único servicio externo implicado es
              Google Drive, donde tú mismo alojas tu CV y tu vídeo bajo tu propia cuenta y
              tus propias condiciones de acceso.
            </p>

            <h2>Tus derechos</h2>
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión y oposición
              sobre tus datos en cualquier momento escribiendo a{" "}
              <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
            </p>

            <p className="lp-legal-back">
              <Link to="/" className="lp-btn lp-btn-outline">
                Volver al inicio
              </Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
