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
    program: "MUIT · HEC Paris, 2º año · ETSIT",
    line: "Puso en marcha TelecoEmprende y ahora lo sigue de cerca desde HEC Paris.",
  },
  {
    name: "Jorge",
    photo: "/equipo-jorge.jpg",
    role: "Ex-vicepresidente · Board Member",
    program: "MUIT · IIT, 2º año · ETSIT",
    line: "El del buen gusto del equipo: si algo tiene que quedar bien, pasa primero por él.",
  },
  {
    name: "Hammad",
    photo: "/equipo-hammad.jpg",
    role: "Presidente",
    program: "GISD, 2º año · ETSIT",
    line: "Coordina el día a día para que el resto del equipo pueda centrarse en construir.",
  },
  {
    name: "Alex",
    photo: "/equipo-alex.jpg",
    role: "Ex-secretario · Board Member",
    program: "MUIT, 2º año · ETSIT",
    line: "Fue el secretario que mantenía todo en orden; ahora sigue dando apoyo desde la sombra.",
  },
  {
    name: "Iker",
    photo: "/equipo-iker.jpg",
    role: "Miembro",
    program: "GISD, 2º año · ETSIT",
    line: "Segundo de GISD. Se mete de lleno en la parte técnica del club.",
  },
  {
    name: "Abril",
    photo: "/equipo-abril.jpg",
    role: "Miembro",
    program: "GISD, 2º año · ETSIT",
    line: "También en 2º de GISD. Aterriza con ganas de aprender haciendo.",
  },
  {
    name: "Alejandro",
    photo: "/equipo-alejandro.jpg",
    role: "Miembro",
    program: "GITST · ETSIT",
    line: "Estudia GITST en la ETSIT. Nuevo en el equipo este curso.",
  },
  {
    name: "Mamoun",
    photo: "/equipo-mamoun.jpg",
    role: "Miembro",
    program: "GII · ETSIInf",
    line: "Ingeniería Informática en la ETSIInf. La mirada distinta que necesitábamos.",
  },
  {
    name: "Diego",
    photo: "/equipo-diego.jpg",
    role: "Miembro",
    program: "GIB · ETSIT",
    line: "Ingeniería Biomédica. Se suma al equipo este curso.",
  },
];

export function AboutSection() {
  return (
    <section className="lp-about" id="quienes-somos">
      <div className="lp-container">
        <span className="lp-eyebrow">Quiénes somos</span>
        <h2 className="lp-heading">
          Nacimos en la ETSIT con un plan: llevar el emprendimiento a toda la UPM
        </h2>
        <p className="lp-section-lead">
          Empezamos como estudiantes de la Escuela Técnica Superior de
          Ingenieros de Telecomunicación (ETSIT-UPM). Nos unía una idea sencilla:
          en ingeniería sobra talento técnico y falta un lugar donde ese talento
          se atreva a montar cosas. Por eso trajimos el emprendimiento a nuestra
          escuela, y este curso abrimos la comunidad a toda la UPM para
          construirla entre todas las escuelas: charlas, contactos y proyectos
          que empiezan entre clase y clase.
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
