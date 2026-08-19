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
            TelecoEmprende nació en la ETSIT como la comunidad de
            emprendimiento de la escuela, y este curso abre sus puertas a toda
            la UPM: gente que trae fundadores a clase, comparte ideas a la
            salida y las convierte en proyectos de verdad. Se abren las
            inscripciones para el curso 2026/27, y esta es tu oportunidad de
            estar dentro desde el día uno, vengas de la escuela que vengas.
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
      </div>
    </section>
  );
}
