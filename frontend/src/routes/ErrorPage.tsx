import { Link } from "react-router-dom";

import { LandingFooter } from "../components/layout/LandingFooter";
import { LandingNav } from "../components/home/LandingNav";

type ErrorPageProps = {
  code: 400 | 404 | 500;
  title: string;
  message: string;
};

/** Página de error genérica (400/404/500), reutilizada por la ruta comodín
 * de React Router y disponible para enlazar directamente si hace falta. */
export function ErrorPage({ code, title, message }: ErrorPageProps) {
  return (
    <div className="lp-shell">
      <LandingNav />
      <main>
        <section className="lp-thankyou">
          <div className="lp-container">
            <div className="lp-thankyou-card lp-error-card">
              <span className="lp-error-code">{code}</span>
              <h1 className="lp-heading">{title}</h1>
              <p className="lp-section-lead lp-thankyou-lead">{message}</p>
              <div className="lp-thankyou-actions">
                <Link to="/" className="lp-btn lp-btn-outline">
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code={404}
      title="Esta página no existe."
      message="Puede que el enlace esté roto o que la dirección tenga un error. Vuelve al inicio y prueba desde ahí."
    />
  );
}
