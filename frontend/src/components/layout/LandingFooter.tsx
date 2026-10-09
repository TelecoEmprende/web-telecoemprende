import { Link, useLocation } from "react-router-dom";

import { WHATSAPP_COMUNIDAD } from "../../data/redes";
import { useTranslation } from "../../i18n/translations";
import { Aparece } from "../home/aparece";

export function LandingFooter() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const onHomePage = pathname === "/";
  const toAnchor = (hash: string) => (onHomePage ? hash : `/${hash}`);

  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-brand">
          <img src="/logo.png" alt="Logo de TelecoEmprende" />
          <div>
            <strong>TelecoEmprende</strong>
            <p>{t.footer.tagline}</p>
            <p className="lp-footer-contact">
              <a href="mailto:telecoemprende.etsit@upm.es">
                telecoemprende.etsit@upm.es
              </a>
            </p>
          </div>
        </div>

        <nav className="lp-footer-links" aria-label={t.footer.linksLabel}>
          <a href={toAnchor("#quienes-somos")}>{t.nav.quienesSomos}</a>
          <a href={toAnchor("#departamentos")}>{t.nav.departamentos}</a>
          <a href={toAnchor("#eventos")}>{t.nav.eventos}</a>
          <a href={toAnchor("#recursos")}>{t.nav.recursos}</a>
          <a href="https://alumni.etsit.upm.es/" target="_blank" rel="noreferrer">
            {t.footer.alumniLink}
          </a>
          <Link to="/privacidad">{t.footer.privacyLink}</Link>
        </nav>

        <div className="lp-footer-social" aria-label={t.footer.socialLabel}>
          <a
            href={WHATSAPP_COMUNIDAD}
            target="_blank"
            rel="noreferrer"
            aria-label={t.footer.whatsappAria}
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path
                fill="currentColor"
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
              />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/telecoemprende/"
            target="_blank"
            rel="noreferrer"
            aria-label={t.footer.instagramAria}
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56a5.88 5.88 0 0 0-2.13 1.38A5.88 5.88 0 0 0 .63 4.14c-.3.76-.5 1.63-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.76.3 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.41-10.4a1.44 1.44 0 1 1-1.44-1.44 1.44 1.44 0 0 1 1.44 1.44Z"
              />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/company/telecoemprende"
            target="_blank"
            rel="noreferrer"
            aria-label={t.footer.linkedinAria}
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.68H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0Z"
              />
            </svg>
          </a>
        </div>

        <p className="lp-footer-note">{t.footer.note}</p>
      </div>

      {/* El nombre a lo ancho, como firma. Decorativo: el nombre ya está arriba.
          Dentro del contenedor, para que arranque y acabe en los mismos
          márgenes que el resto del pie. */}
      <div className="lp-container lp-footer-firma-caja">
        <Aparece className="lp-footer-firma" como="p">
          <span aria-hidden="true">
            Teleco<span>Emprende</span>
          </span>
        </Aparece>
      </div>
    </footer>
  );
}
