import { useEffect, useRef, useState } from "react";

import { useTranslation } from "../../i18n/translations";
import { ScrollRevealText } from "./ScrollRevealText";

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
    role: { es: "VP de Eventos y Logística", en: "VP of Events & Logistics" },
    program: "GISD · ETSIT",
    line: {
      es: "Dirección de Eventos, logística, cartelería y materiales visuales.",
      en: "Leads Events: logistics, signage and visual materials.",
    },
  },
  {
    name: "Abril",
    photo: "/equipo-abril.jpg",
    role: { es: "VP de Tech e Ingeniería", en: "VP of Tech & Engineering" },
    program: "GISD · ETSIT",
    line: {
      es: "Tecnología, ingeniería, producto y soporte técnico.",
      en: "Technology, engineering, product and technical support.",
    },
  },
  {
    name: "Mamoun",
    photo: "/equipo-mamoun.jpg",
    role: { es: "Miembro · Gestión Logística de Eventos", en: "Member · Events Logistics" },
    program: "GII · ETSIINF",
    line: {
      es: "Organización logística, materiales, espacios y necesidades operativas.",
      en: "Logistics, materials, venues and operational needs.",
    },
  },
  {
    name: "Diego",
    photo: "/equipo-diego.jpg",
    role: { es: "Miembro · Comunicación de Eventos", en: "Member · Events Communications" },
    program: "GIB · ETSIT",
    line: {
      es: "Comunicación, promoción, captación y RRSS vinculadas a Eventos.",
      en: "Communications, promotion, recruitment and Events-related social media.",
    },
  },
  {
    name: "David",
    photo: "/equipo-david.jpg",
    role: { es: "Miembro · Preparación de Eventos", en: "Member · Events Preparation" },
    program: "GISD · ETSIT",
    line: {
      es: "Preparación operativa, montaje, coordinación previa y ejecución.",
      en: "Operational prep, setup, advance coordination and execution.",
    },
  },
  {
    name: "Hugo",
    photo: "/equipo-hugo.jpg",
    role: { es: "Miembro · Operaciones de Eventos", en: "Member · Events Operations" },
    program: "GITST · ETSIT",
    line: {
      es: "Apoyo en montaje, ejecución y necesidades operativas.",
      en: "Support with setup, execution and operational needs.",
    },
  },
  {
    name: "Guillermo",
    photo: "/equipo-guillermo.jpg",
    role: { es: "Miembro · Experiencia y Activaciones de Eventos", en: "Member · Events Experience & Activations" },
    program: "GITST · ETSIT",
    line: {
      es: "Apoyo en dinámicas, demos, activaciones y ejecución durante Eventos.",
      en: "Support with activities, demos, activations and on-site execution.",
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
        <ScrollRevealText text={t.about.lead} className="lp-section-lead" />

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
                  <div className="lp-team-role-slot">
                    <span className="lp-team-role">{member.role[language]}</span>
                  </div>
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
