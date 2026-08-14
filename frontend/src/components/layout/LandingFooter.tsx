import { useLocation } from "react-router-dom";

export function LandingFooter() {
  const { pathname } = useLocation();
  const onHomePage = pathname === "/";
  const toAnchor = (hash: string) => (onHomePage ? hash : `/${hash}`);

  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-brand">
          <img src="/logo.png" alt="Logo de TelecoEmprende" />
          <div>
            <strong>TelecoEmprende</strong>
            <p>
              Club de emprendimiento de la Escuela Técnica Superior de
              Ingenieros de Telecomunicación (ETSIT-UPM).
            </p>
          </div>
        </div>

        <nav className="lp-footer-links" aria-label="Enlaces del pie de página">
          <a href={toAnchor("#quienes-somos")}>Quiénes somos</a>
          <a href={toAnchor("#departamentos")}>Departamentos</a>
          <a href={toAnchor("#eventos")}>Eventos</a>
          <a href={toAnchor("#inscripcion")}>Inscripción</a>
        </nav>

        <div className="lp-footer-social" aria-label="Redes sociales de TelecoEmprende">
          <a
            href="https://www.instagram.com/telecoemprende/"
            target="_blank"
            rel="noreferrer"
            aria-label="TelecoEmprende en Instagram"
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
            aria-label="TelecoEmprende en LinkedIn"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.68H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0Z"
              />
            </svg>
          </a>
        </div>

        <p className="lp-footer-note">
          Hecho con ☕ entre clase y clase, en la ETSIT.
        </p>
      </div>
    </footer>
  );
}
