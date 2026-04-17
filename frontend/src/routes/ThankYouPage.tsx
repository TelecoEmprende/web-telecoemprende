import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { ParticleBackground } from "../components/layout/ParticleBackground";

type ThankYouState = {
  attendeeName?: string;
  attendeeEmail?: string;
};

export function ThankYouPage() {
  const whatsappCommunityUrl = "https://chat.whatsapp.com/DdllRrRTg3REkyYW248uFP";
  const location = useLocation();
  const state = (location.state as ThankYouState | null) ?? null;
  const attendeeName = state?.attendeeName?.trim();
  const attendeeEmail = state?.attendeeEmail?.trim();
  const firstName = attendeeName ? attendeeName.split(/\s+/)[0] : null;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="page-shell">
      <ParticleBackground />
      <Header />
      <main className="page-content thank-you-page-react">
        <section className="thank-you-section-react">
          <div className="container-react">
            <div className="thank-you-card-react">
              <span className="section-eyebrow-react">Registro completado</span>
              <h1>
                {firstName ? `Gracias, ${firstName}.` : "Gracias por registrarte."}
              </h1>
              <p className="thank-you-lead-react">
                Estamos deseando verte en Teleco Builders 2026. Tu plaza ha quedado
                registrada correctamente.
              </p>

              <div className="thank-you-note-react">
                <strong>Te enviaremos un email con toda la información práctica del evento.</strong>
                <p>
                  {attendeeEmail
                    ? `Lo recibirás en ${attendeeEmail}.`
                    : "Recibirás la confirmación y los detalles del encuentro en tu correo electrónico."}
                </p>
              </div>

              <div className="thank-you-meta-react" aria-label="Información del evento">
                <div className="meta-item-react">📍 Aula Magna, ETSIT UPM</div>
                <div className="meta-item-react">📅 29 de abril</div>
                <div className="meta-item-react">⏰ 18:00 - 20:00</div>
              </div>

              <div className="thank-you-points-react">
                <div className="thank-you-point-react">
                  <strong>⌛️ ¿Qué te espera?</strong>
                  <span>Charlas cercanas, experiencia real y networking con el ecosistema.</span>
                </div>
                <div className="thank-you-point-react">
                  <strong>🪜 Siguiente paso</strong>
                  <span>Revisa tu correo en los próximos días para no perderte ningún detalle.</span>
                </div>
              </div>

              <div className="thank-you-actions-react">
                <Link to="/" className="primary-btn-react">
                  Volver al inicio
                </Link>
                <a href={whatsappCommunityUrl} className="highlight-btn-react thank-you-whatsapp-btn-react">
                  <span className="highlight-btn-icon-react" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path
                        fill="currentColor"
                        d="M19.05 4.94A9.93 9.93 0 0 0 12.02 2C6.52 2 2.04 6.48 2.04 11.98c0 1.76.46 3.48 1.34 5L2 22l5.18-1.36a9.94 9.94 0 0 0 4.84 1.23h.01c5.5 0 9.98-4.48 9.98-9.98a9.9 9.9 0 0 0-2.96-6.95Zm-7.03 15.24h-.01a8.3 8.3 0 0 1-4.22-1.16l-.3-.18-3.07.81.82-2.99-.2-.31a8.25 8.25 0 0 1-1.27-4.37c0-4.56 3.71-8.27 8.28-8.27 2.21 0 4.28.86 5.85 2.42a8.2 8.2 0 0 1 2.42 5.85c0 4.57-3.71 8.28-8.3 8.28Zm4.54-6.2c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.17.25-.65.8-.8.96-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.77-1.84-.2-.48-.4-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.43 1.02 2.6c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.42 1.44.54.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.17.21-.58.21-1.07.15-1.17-.06-.1-.23-.15-.48-.27Z"
                      />
                    </svg>
                  </span>
                  Únete a la comunidad de WhatsApp!
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
