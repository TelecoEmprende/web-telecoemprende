import { useEffect, useRef, useState } from "react";

import { useTranslation } from "../../i18n/translations";

type Bilingual = { es: string; en: string };

type TeamMember = {
  name: string;
  alias?: string;
  photo: string;
  role: Bilingual;
  program: string;
  line: Bilingual;
};

const TEAM: TeamMember[] = [
  {
    name: "Mariano",
    photo: "/equipo-mariano.jpg",
    role: { es: "Ex-presidente · Board Member", en: "Former President · Board Member" },
    program: "MUIT · HEC Paris · ETSIT",
    line: {
      es: "Puso en marcha TelecoEmprende y ahora lo sigue de cerca desde HEC Paris.",
      en: "Got TelecoEmprende off the ground and now follows it closely from HEC Paris.",
    },
  },
  {
    name: "Jorge",
    photo: "/equipo-jorge.jpg",
    role: { es: "Ex-vicepresidente · Board Member", en: "Former Vice President · Board Member" },
    program: "MUIT · IIT · ETSIT",
    line: {
      es: "El del buen gusto del equipo: si algo tiene que quedar bien, pasa primero por él.",
      en: "The team's taste-maker: if something needs to look right, it goes through him first.",
    },
  },
  {
    name: "Hammad",
    photo: "/equipo-hammad.jpg",
    role: { es: "Presidente", en: "President" },
    program: "GISD · ETSIT",
    line: {
      es: "Coordina el día a día para que el resto del equipo pueda centrarse en construir.",
      en: "Coordinates the day-to-day so the rest of the team can focus on building.",
    },
  },
  {
    name: "Alex",
    photo: "/equipo-alex.jpg",
    role: { es: "Ex-secretario · Board Member", en: "Former Secretary · Board Member" },
    program: "MUIT · ETSIT",
    line: {
      es: "Fue el secretario que mantenía todo en orden; ahora sigue dando apoyo desde la sombra.",
      en: "Was the secretary who kept everything in order; still supporting from behind the scenes.",
    },
  },
  {
    name: "Iker",
    photo: "/equipo-iker.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GISD · ETSIT",
    line: {
      es: "Aunque estudiante del GISD, con gusto por la inversión.",
      en: "A GISD student with a taste for investing.",
    },
  },
  {
    name: "Abril",
    photo: "/equipo-abril.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GISD · ETSIT",
    line: {
      es: "Disfruta convirtiendo ideas en proyectos que funcionen.",
      en: "Enjoys turning ideas into projects that actually work.",
    },
  },
  {
    name: "Alejandro",
    photo: "/equipo-alejandro.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GITST · ETSIT",
    line: {
      es: "Aporta una mirada fresca al equipo.",
      en: "Brings a fresh perspective to the team.",
    },
  },
  {
    name: "Mamoun",
    photo: "/equipo-mamoun.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GII · ETSIINF",
    line: {
      es: "Ingeniería Informática en la ETSIINF. La mirada distinta que necesitábamos.",
      en: "Computer Engineering at ETSIINF. The different perspective we needed.",
    },
  },
  {
    name: "Diego",
    photo: "/equipo-diego.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GIB · ETSIT",
    line: {
      es: "Le mola la IA, Data Analytics, ML, DL y la Ingeniería Biomédica.",
      en: "Into AI, Data Analytics, ML, DL and Biomedical Engineering.",
    },
  },
  {
    name: "David",
    photo: "/equipo-david.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GISD · ETSIT",
    line: {
      es: "Ingeniero de día, piloto de noche.",
      en: "Engineer by day, pilot by night.",
    },
  },
  {
    name: "Hugo",
    photo: "/equipo-hugo.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GITST · ETSIT",
    line: {
      es: "Suma energía nueva al equipo.",
      en: "Adds fresh energy to the team.",
    },
  },
  {
    name: "Guillermo",
    photo: "/equipo-guillermo.jpg",
    role: { es: "Miembro", en: "Member" },
    program: "GITST · ETSIT",
    line: {
      es: "Se une con muchas ganas de aportar.",
      en: "Joins with plenty of drive to contribute.",
    },
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
  const { t, language } = useTranslation();
  const trackRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function updateFromScroll() {
      if (!track) return;
      setAtStart(track.scrollLeft <= 4);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);

      let closestIndex = 0;
      let closestDistance = Infinity;
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const distance = Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setActiveIndex(closestIndex);
    }

    updateFromScroll();
    track.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
    return () => {
      track.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
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
        <span className="lp-eyebrow">{t.about.eyebrow}</span>
        <h2 className="lp-heading">{t.about.heading}</h2>
        <p className="lp-section-lead">{t.about.lead}</p>

        <div
          className="lp-team-carousel"
          role="region"
          aria-roledescription="carrusel"
          aria-label={t.about.carouselLabel}
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
                    alt={`${t.about.photoAlt} ${member.name}`}
                    loading="lazy"
                  />
                </div>
                <div className="lp-team-body">
                  <h3>
                    {member.name}
                    {member.alias ? <span className="lp-team-alias">“{member.alias}”</span> : null}
                  </h3>
                  <span className="lp-team-role">{member.role[language]}</span>
                  <span className="lp-team-program">{member.program}</span>
                  <p>{member.line[language]}</p>
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
              aria-label={t.about.prevAria}
            >
              <ArrowIcon direction="left" />
            </button>

            <div className="lp-team-dots" role="group" aria-label={t.about.dotsLabel}>
              {TEAM.map((member, index) => (
                <button
                  key={member.name}
                  type="button"
                  className={`lp-team-dot${index === activeIndex ? " is-active" : ""}`}
                  aria-label={`${t.about.dotAria} ${member.name}`}
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
              aria-label={t.about.nextAria}
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
