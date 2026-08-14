type Department = {
  icon: string;
  title: string;
  lines: [string, string, string];
};

const DEPARTMENTS: Department[] = [
  {
    icon: "💻",
    title: "Tech/Ingeniería",
    lines: [
      "Mantienes viva la red de alumni: la conexión entre quienes ya salieron de la ETSIT y quienes seguimos aquí.",
      "Construyes y cuidas la web del club, la cara digital de TelecoEmprende, siempre lista para el siguiente reto.",
      "Metes las manos en los proyectos técnicos que van surgiendo: herramientas internas, automatizaciones, lo que haga falta.",
    ],
  },
  {
    icon: "📣",
    title: "Marketing/Comms",
    lines: [
      "Llevas el Instagram y el LinkedIn del club: cuentas lo que hacemos antes, durante y después de cada evento.",
      "Escribes el copy que hace que alguien deje de hacer scroll y quiera apuntarse.",
      "Cuidas la imagen de TelecoEmprende: que cada publicación se vea, suene y sienta como nosotros.",
    ],
  },
  {
    icon: "🎤",
    title: "Eventos/Logística",
    lines: [
      "Organizas los eventos de principio a fin: desde la idea hasta que se apagan las luces de la sala.",
      "Lideras una de las partes que más se nota del club: si algo sale bien el día del evento, es gracias a ti.",
      "Te encargas de la logística — salas, horarios, ponentes, imprevistos — para que todo fluya sin que nadie note el esfuerzo detrás.",
    ],
  },
];

export function DepartmentsSection() {
  return (
    <section className="lp-departments" id="departamentos">
      <div className="lp-container">
        <span className="lp-eyebrow">Departamentos</span>
        <h2 className="lp-heading">Elige dónde quieres construir</h2>
        <p className="lp-section-lead">
          TelecoEmprende se sostiene en tres patas. Cada una tiene su propio
          terreno de juego, pero todas empujan en la misma dirección.
        </p>

        <div className="lp-departments-grid">
          {DEPARTMENTS.map((dept) => (
            <article className="lp-department-card" key={dept.title}>
              <span className="lp-department-icon" aria-hidden="true">
                {dept.icon}
              </span>
              <h3>{dept.title}</h3>
              <ul className="lp-department-lines">
                {dept.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
