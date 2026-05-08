import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { RegistrationForm } from "../components/home/RegistrationForm";
import { TrustSection } from "../components/home/TrustSection";
import { ParticleBackground } from "../components/layout/ParticleBackground";

export function EventoSantiPabloPage() {
  const whatsappCommunityUrl = "https://chat.whatsapp.com/DdllRrRTg3REkyYW248uFP";

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
                <span>Creadores de contenido desde cero</span>
              </h1>

              <p className="hero-description-react">
TelecoEmprende presenta una charla con Santi y Pablo, creadores de contenido que han construido su comunidad desde cero.

Compartirán su proceso real: qué hicieron, qué no funcionó y cómo acabaron conectando con su audiencia.              </p>

              <div className="event-meta-react">
                <div className="meta-item-react">📍 Sala de Profesores, Edificio C, ETSIT UPM</div>
                <div className="meta-item-react">📅 1 de Junio</div>
                <div className="meta-item-react">⏰ 16:00 - 17:00</div>
              </div>

              <div className="hero-actions-react">
                <a href="#registro" className="primary-btn-react">
                  Reservar plaza 
                </a>
              </div>

              <div className="highlight-box-react" id="detalle">
                <div className="highlight-line-react" />
                <div>
                  <strong>🚆 TelecoEmprende</strong>
                  <p>
                    Club de emprendimiento de la ETSIT UPM. 
                  </p>
                  <a
                    href={whatsappCommunityUrl}
                    className="highlight-btn-react"
                  >
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

            <aside className="hero-panel-react">
              <div className="panel-card-react">
                <div className="panel-top-react">
                  <span className="panel-mini-tag-react">Evento</span>
                  <span className="panel-status-react">Abierto</span>
                </div>

                <h2>Santi y Pablo</h2>
                <p>
                  Dos ingenieros que decidieron no quedarse solo con el camino típico.
                  </p>
<p>Santi (Madrid) lleva años creando contenido y construyendo su marca personal desde cero.
Pablo (Zaragoza) destaca por su mentalidad creativa y su constante búsqueda de nuevas ideas.</p>

<p>Ambos comparten una misma inquietud: crear algo propio más allá de la ingeniería.</p>

                


                <div className="panel-flow-react" aria-label="Qué verás en la charla">
                  <div className="panel-flow-step-react">
                    <span className="panel-flow-icon-react" aria-hidden="true">🎥</span>
                    <div>
                      <strong>Cómo empezar desde cero</strong>
                      <span>Sin equipo caro ni experiencia previa. Solo constancia y criterio.</span>
                    </div>
                  </div>

                  <div className="panel-flow-step-react">
                    <span className="panel-flow-icon-react" aria-hidden="true">📊</span>
                    <div>
                      <strong>Hacer crecer un canal</strong>
                      <span>Qué funciona, qué no, y cómo encontrar tu propia voz.</span>
                    </div>
                  </div>

                  <div className="panel-flow-step-react">
                    <span className="panel-flow-icon-react" aria-hidden="true">💡</span>
                    <div>
                      <strong>El salto a crear algo propio</strong>
                      <span>De la creación de contenido a construir proyectos reales.</span>
                    </div>
                  </div>
                </div>

                <ul className="panel-points-react panel-points-compact-react">
                  <li>Creadores de contenido que son ingenieros como tú</li>
                  <li>Experiencias reales, sin filtros ni discursos corporativos</li>
                  <li>Un espacio para plantearte qué puedes construir tú</li>
                </ul>

                <a href="#registro" className="panel-btn-react">
                  Ir al formulario <span aria-hidden="true">→</span>
                </a>
              </div>
            </aside>
          </div>
        </section>
        <TrustSection />
        <RegistrationForm evento="charla-santi-y-pablo" title="Formulario de registro - Charla con Santi y Pablo" />
      </main>
      <Footer />
    </div>
  );
}

