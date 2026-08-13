export function HeroSection() {
  return (
    <section className="lp-hero" id="inicio">
      <div className="lp-hero-glow lp-hero-glow-gold" aria-hidden="true" />
      <div className="lp-hero-glow lp-hero-glow-orange" aria-hidden="true" />

      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="lp-hero-eyebrow">
            <span className="lp-hero-dot" aria-hidden="true" />
            Curso 2026/27 · Inscripciones abiertas
          </p>

          <h1>
            ¿Montamos algo <span>juntos</span> este curso?
          </h1>

          <p className="lp-hero-lead">
            TelecoEmprende es la comunidad de emprendimiento de la ETSIT: gente
            de teleco que trae fundadores a la escuela, comparte ideas a la
            salida de clase y las convierte en proyectos de verdad. Se abren
            las inscripciones para el curso 2026/27 — y esta es tu oportunidad
            de estar dentro desde el día uno.
          </p>

          <div className="lp-hero-actions">
            <a href="#inscripcion" className="lp-btn lp-btn-gold">
              Envía tu solicitud de inscripción <span aria-hidden="true">→</span>
            </a>
            <a href="#quienes-somos" className="lp-btn lp-btn-ghost">
              Conócenos antes
            </a>
          </div>

          <ul className="lp-hero-chips" aria-label="Qué encontrarás en TelecoEmprende">
            <li>🎙️ Charlas con fundadores</li>
            <li>🤝 Networking de verdad</li>
            <li>🚀 Proyectos propios</li>
          </ul>
        </div>

        <div className="lp-hero-collage" aria-hidden="true">
          <figure className="lp-hero-photo lp-hero-photo-solo">
            <img src="/hero-badge-etsit.jpg" alt="" loading="eager" />
          </figure>
          <span className="lp-hero-sticker">Curso 26/27</span>
        </div>
      </div>
    </section>
  );
}
