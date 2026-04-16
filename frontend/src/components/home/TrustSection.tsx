const ITEMS = [
  {
    label: "Comunidad",
    value: "Estudiantes, alumni y emprendedores",
  },
  {
    label: "Enfoque",
    value: "Ideas, conexion y ejecucion",
  },
  {
    label: "Organiza",
    value: "TelecoEmprende",
  },
];

export function TrustSection() {
  return (
    <section className="trust-section-react">
      <div className="container-react trust-grid-react">
        {ITEMS.map((item) => (
          <div className="trust-item-react" key={item.label}>
            <span className="trust-label-react">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
