import { useEffect, useRef, useState } from "react";

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
    program: "MUIT · HEC Paris · ETSIT",
    line: "Puso en marcha TelecoEmprende y ahora lo sigue de cerca desde HEC Paris.",
  },
  {
    name: "Jorge",
    photo: "/equipo-jorge.jpg",
    role: "Ex-vicepresidente · Board Member",
    program: "MUIT · IIT · ETSIT",
    line: "El del buen gusto del equipo: si algo tiene que quedar bien, pasa primero por él.",
  },
  {
    name: "Hammad",
    photo: "/equipo-hammad.jpg",
    role: "Presidente",
    program: "GISD · ETSIT",
    line: "Coordina el día a día para que el resto del equipo pueda centrarse en construir.",
  },
  {
    name: "Alex",
    photo: "/equipo-alex.jpg",
    role: "Ex-secretario · Board Member",
    program: "MUIT · ETSIT",
    line: "Fue el secretario que mantenía todo en orden; ahora sigue dando apoyo desde la sombra.",
  },
  {
    name: "Iker",
    photo: "/equipo-iker.jpg",
    role: "Miembro",
    program: "GISD · ETSIT",
    line: "Aunque estudiante del GISD, con gusto por la inversión.",
  },
  {
    name: "Abril",
    photo: "/equipo-abril.jpg",
    role: "Miembro",
    program: "GISD · ETSIT",
    line: "Disfruta convirtiendo ideas en proyectos que funcionen.",
  },
  {
    name: "Alejandro",
    photo: "/equipo-alejandro.jpg",
    role: "Miembro",
    program: "GITST · ETSIT",
    line: "Aporta una mirada fresca al equipo.",
  },
  {
    name: "Mamoun",
    photo: "/equipo-mamoun.jpg",
    role: "Miembro",
    program: "GII · ETSIINF",
    line: "Ingeniería Informática en la ETSIINF. La mirada distinta que necesitábamos.",
  },
  {
    name: "Diego",
    photo: "/equipo-diego.jpg",
    role: "Miembro",
    program: "GIB · ETSIT",
    line: "Le mola la IA, Data Analytics, ML, DL y la Ingeniería Biomédica.",
  },
  {
    name: "David",
    photo: "/equipo-david.jpg",
    role: "Miembro",
    program: "GISD · ETSIT",
    line: "Ingeniero de día, piloto de noche.",
  },
  {
    name: "Hugo",
    photo: "/equipo-hugo.jpg",
    role: "Miembro",
    program: "GITST · ETSIT",
    line: "Suma energía nueva al equipo.",
  },
  {
    name: "Guillermo",
    photo: "/equipo-guillermo.jpg",
    role: "Miembro",
    program: "GITST · ETSIT",
    line: "Se une con muchas ganas de aportar.",
  },
];

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AboutSection() {
  const trackRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = cardRefs.current.findIndex((el) => el === entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        }
      },
      { root: track, threshold: [0.6] },
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function updateEdges() {
      if (!track) return;
      setAtStart(track.scrollLeft <= 4);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
    }

    updateEdges();
    track.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      track.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);

  function scrollToCard(index: number) {
    const card = cardRefs.current[index];
    const track = trackRef.current;
    if (!card || !track) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }

  function scrollByStep(direction: 1 | -1) {
    const nextIndex = Math.min(Math.max(activeIndex + direction, 0), TEAM.length - 1);
    scrollToCard(nextIndex);
  }

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

        <div
          className="lp-team-carousel"
          role="region"
          aria-roledescription="carrusel"
          aria-label="Miembros del equipo"
        >
          <ul className="lp-team-track" ref={trackRef}>
            {TEAM.map((member, index) => (
              <li
                className="lp-team-card"
                key={member.name}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
              >
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
              </li>
            ))}
          </ul>

          <div className="lp-team-controls">
            <button
              type="button"
              className="lp-team-arrow"
              onClick={() => scrollByStep(-1)}
              disabled={atStart}
              aria-label="Ver miembro anterior"
            >
              <ArrowIcon direction="left" />
            </button>

            <div className="lp-team-dots" role="group" aria-label="Ir a un miembro del equipo">
              {TEAM.map((member, index) => (
                <button
                  key={member.name}
                  type="button"
                  className={`lp-team-dot${index === activeIndex ? " is-active" : ""}`}
                  aria-label={`Ver a ${member.name}`}
                  aria-current={index === activeIndex}
                  onClick={() => scrollToCard(index)}
                />
              ))}
            </div>

            <button
              type="button"
              className="lp-team-arrow"
              onClick={() => scrollByStep(1)}
              disabled={atEnd}
              aria-label="Ver siguiente miembro"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
