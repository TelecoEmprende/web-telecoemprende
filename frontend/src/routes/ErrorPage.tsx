import { Link } from "react-router-dom";

import { LandingFooter } from "../components/layout/LandingFooter";
import { LandingNav } from "../components/home/LandingNav";

/** Página de la ruta comodín de React Router. */
export function NotFoundPage() {
  return (
    <div className="lp-shell">
      <LandingNav />
      <main>
        <section className="lp-thankyou">
          <div className="lp-container">
            <div className="lp-thankyou-card lp-error-card">
              <span className="lp-error-code">404</span>
              <h1 className="lp-heading">Esta página no existe.</h1>
              <p className="lp-section-lead lp-thankyou-lead">
                Puede que el enlace esté roto o que la dirección tenga un error. Vuelve al inicio y prueba desde ahí.
              </p>
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
