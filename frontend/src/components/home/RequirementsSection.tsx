const REQUIREMENTS = [
  {
    icon: "📄",
    title: "Un CV",
    line: "Que muestre bien tus skills, tu experiencia y los proyectos que más te representen. No hace falta que sea perfecto, que sea tuyo.",
  },
  {
    icon: "🎥",
    title: "Un vídeo (máx. 2 min)",
    line: "Cuéntanos por qué quieres formar parte de TelecoEmprende y por qué deberíamos elegirte a ti. Vale una cámara del móvil, cuenta lo que dices.",
  },
];

export function RequirementsSection() {
  return (
    <section className="lp-requirements" id="requisitos">
      <div className="lp-container">
        <span className="lp-eyebrow">Antes de enviar tu solicitud</span>
        <h2 className="lp-heading">Qué necesitamos para valorarla</h2>
        <p className="lp-section-lead">
          Súbelo todo a una carpeta de Google Drive, activa el acceso por
          enlace y pega el enlace en el formulario. Así de sencillo.
        </p>

        <div className="lp-requirements-grid">
          {REQUIREMENTS.map((req) => (
            <article className="lp-requirement-card" key={req.title}>
              <span className="lp-requirement-icon" aria-hidden="true">
                {req.icon}
              </span>
              <h3>{req.title}</h3>
              <p>{req.line}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
