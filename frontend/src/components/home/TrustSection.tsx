const ITEMS = [
  {
    label: "👥 Comunidad",
    value: "Estudiantes, alumni y emprendedores.",
  },
  {
    label: "🎯 Enfoque",
    value: "Ideas, conexión y ejecución.",
  },
  {
    label: "🚀 Organizado por",
    value: "TelecoEmprende, club de emprendimiento de la ETSIT-UPM.",
  },
];

export function TrustSection() {
  return (
    <section className="trust-section-react">
      <div className="container-react trust-marquee-react">
        <div className="trust-grid-react">
          {[0, 1].map((trackIndex) => (
            <div
              className={`trust-track-react ${trackIndex === 0 ? "trust-track-primary-react" : "trust-track-secondary-react"}`}
              key={trackIndex}
              aria-hidden={trackIndex === 1}
            >
              {ITEMS.map((item) => (
                <div className="trust-item-react" key={`${trackIndex}-${item.label}`}>
                  <span className="trust-label-react">{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
