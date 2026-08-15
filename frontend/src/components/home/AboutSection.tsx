type TeamMember = {
  name: string;
  alias?: string;
  photo: string;
  role: string;
  program: string;
  line: string;
};

const TEAM: TeamMember[] = [
  {
    name: "Mariano",
    photo: "/equipo-mariano.jpg",
    role: "Ex-presidente · Board Member",
    program: "MUIT · HEC Paris, 2º año",
    line: "Puso en marcha TelecoEmprende y ahora lo sigue de cerca desde HEC Paris.",
  },
  {
    name: "Jorge",
    photo: "/equipo-jorge.jpg",
    role: "Ex-vicepresidente · Board Member",
    program: "MUIT · IIT, 2º año",
    line: "El del buen gusto del equipo: si algo tiene que quedar bien, pasa primero por él.",
  },
  {
    name: "Hammad",
    photo: "/equipo-hammad.jpg",
    role: "Presidente",
    program: "GISD, 2º año",
    line: "Coordina el día a día para que el resto del equipo pueda centrarse en construir.",
  },
  {
    name: "Alex",
    photo: "/equipo-alex.jpg",
    role: "Ex-secretario · Board Member",
    program: "MUIT, 2º año",
    line: "Fue el secretario que mantenía todo en orden; ahora sigue dando apoyo desde la sombra.",
  },
];

export function AboutSection() {
  return (
    <section className="lp-about" id="quienes-somos">
      <div className="lp-container">
        <span className="lp-eyebrow">Quiénes somos</span>
        <h2 className="lp-heading">
          Estudiantes de la ETSIT con un plan: acercar el emprendimiento a la escuela
        </h2>
        <p className="lp-section-lead">
          Somos estudiantes de ingeniería de la Escuela Técnica Superior de
          Ingenieros de Telecomunicación (ETSIT-UPM). Nos une una idea sencilla: en teleco sobra
          talento técnico y falta un lugar donde ese talento se atreva a montar
          cosas. Por eso traemos el mundo del emprendimiento a la ETSIT y
          construimos una comunidad alrededor: charlas, contactos y proyectos que
          empiezan entre clase y clase.
        </p>

        <div className="lp-team-grid">
          {TEAM.map((member) => (
            <article className="lp-team-card" key={member.name}>
              <div className="lp-team-photo">
                <img
                  src={member.photo}
                  alt={`Foto de ${member.name}`}
                  loading="lazy"
                />
              </div>
              <div className="lp-team-body">
                <h3>
                  {member.name}
                  {member.alias ? <span className="lp-team-alias">“{member.alias}”</span> : null}
                </h3>
                <span className="lp-team-role">{member.role}</span>
                <span className="lp-team-program">{member.program}</span>
                <p>{member.line}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
