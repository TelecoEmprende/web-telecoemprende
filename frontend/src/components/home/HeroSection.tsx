export function HeroSection() {
  return (
    <section className="hero-section-react" id="evento">
      <div className="container-react hero-grid-react">
        <div className="hero-copy-react">
          <div className="hero-badges-react">
            <span className="tag-react">REGISTRO ABIERTO 2026</span>
            <span className="spots-badge-react">Plazas limitadas</span>
          </div>

          <h1>
            TelecoEmprende
            <br />
            <span>Conectando el Futuro</span>
          </h1>

          <p className="hero-description-react">
            Unete al evento de emprendimiento para estudiantes y graduados de
            telecomunicaciones. Reserva tu plaza y recibe toda la informacion
            del encuentro.
          </p>

          <div className="event-meta-react">
            <div className="meta-item-react">ETSIT UPM</div>
            <div className="meta-item-react">Abril 2026</div>
            <div className="meta-item-react">Charlas, networking e ideas</div>
          </div>

          <div className="hero-actions-react">
            <a href="#registro" className="primary-btn-react">
              Reservar plaza
            </a>
            <a href="#detalle" className="secondary-link-react">
              Ver detalles
            </a>
          </div>

          <div className="highlight-box-react" id="detalle">
            <div className="highlight-line-react" />
            <div>
              <strong>Proxima parada: innovacion</strong>
              <p>
                Charlas, networking y oportunidades reales para impulsar ideas
                con impacto.
              </p>
            </div>
          </div>
        </div>

        <aside className="hero-panel-react">
          <div className="panel-card-react">
            <div className="panel-top-react">
              <span className="panel-mini-tag-react">Evento</span>
              <span className="panel-status-react">Abierto</span>
            </div>

            <h2>Reserva tu plaza</h2>
            <p>
              El registro te permitira recibir la informacion practica del
              evento y futuras comunicaciones relacionadas.
            </p>

            <ul className="panel-points-react">
              <li>Acceso prioritario a la informacion del encuentro</li>
              <li>Comunidad de estudiantes, alumni y perfiles emprendedores</li>
              <li>Proceso de registro rapido y sencillo</li>
            </ul>

            <a href="#registro" className="panel-btn-react">
              Ir al formulario <span aria-hidden="true">→</span>
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
