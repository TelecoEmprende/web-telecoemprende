import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { RegistrationForm } from "../components/home/RegistrationForm";
import { TrustSection } from "../components/home/TrustSection";
import { ParticleBackground } from "../components/layout/ParticleBackground";

export function EventoSantiPabloPage() {
  return (
    <div className="page-shell">
      <ParticleBackground />
      <Header />
      <main className="page-content">
        <section className="hero-section-react" id="evento">
          <div className="container-react hero-grid-react">
            <div className="hero-copy-react">
              <div className="hero-badges-react">
                <span className="tag-react">REGISTRO ABIERTO 2026</span>
                <span className="spots-badge-react">Plazas limitadas</span>
              </div>

              <h1>
                Teleco Builders 2026
                <br />
                <span>Charla con Santi y Pablo</span>
              </h1>

              <p className="hero-description-react">
                Únete al mayor evento de emprendimiento para estudiantes de la UPM.
                Reserva tu plaza y recibe toda la información del encuentro.
              </p>

              <div className="event-meta-react">
                <div className="meta-item-react">📍 Aula Magna, ETSIT UPM</div>
                <div className="meta-item-react">📅 14 de mayo de 2026</div>
                <div className="meta-item-react">⏰ 19:00 - 21:00</div>
                <div className="meta-item-react">👀 Charlas, networking e ideas</div>
              </div>
            </div>
          </div>
        </section>
        <TrustSection />
        <RegistrationForm evento="charla-santi-y-pablo" />
      </main>
      <Footer />
    </div>
  );
}
