import { useTranslation } from "../../i18n/translations";

type Bilingual = { es: string; en: string };

type Department = {
  icon: string;
  title: Bilingual;
  lines: [Bilingual, Bilingual, Bilingual];
};

const DEPARTMENTS: Department[] = [
  {
    icon: "💻",
    title: { es: "Tech/Ingeniería", en: "Tech/Engineering" },
    lines: [
      {
        es: "Mantienes viva la red de alumni: la conexión entre quienes ya salieron de la ETSIT y quienes seguimos aquí.",
        en: "You keep the alumni network alive: the connection between those who already left ETSIT and those of us still here.",
      },
      {
        es: "Construyes y cuidas la web del club, la cara digital de TelecoEmprende, siempre lista para el siguiente reto.",
        en: "You build and maintain the club's website, TelecoEmprende's digital face, always ready for the next challenge.",
      },
      {
        es: "Metes las manos en los proyectos técnicos que van surgiendo: herramientas internas, automatizaciones, lo que haga falta.",
        en: "You get hands-on with whatever technical projects come up: internal tools, automations, whatever's needed.",
      },
    ],
  },
  {
    icon: "📣",
    title: { es: "Marketing/Comms", en: "Marketing/Comms" },
    lines: [
      {
        es: "Llevas el Instagram y el LinkedIn del club: cuentas lo que hacemos antes, durante y después de cada evento.",
        en: "You run the club's Instagram and LinkedIn: telling what we do before, during and after every event.",
      },
      {
        es: "Escribes el copy que hace que alguien deje de hacer scroll y quiera apuntarse.",
        en: "You write the copy that makes someone stop scrolling and want to sign up.",
      },
      {
        es: "Cuidas la imagen de TelecoEmprende: que cada publicación se vea, suene y sienta como nosotros.",
        en: "You look after TelecoEmprende's image: making every post look, sound and feel like us.",
      },
    ],
  },
  {
    icon: "🎤",
    title: { es: "Eventos/Logística", en: "Events/Logistics" },
    lines: [
      {
        es: "Organizas los eventos de principio a fin: desde la idea hasta que se apagan las luces de la sala.",
        en: "You organize events from start to finish: from the idea to the lights going out in the room.",
      },
      {
        es: "Lideras una de las partes que más se nota del club: si algo sale bien el día del evento, es gracias a ti.",
        en: "You lead one of the club's most visible parts: if something goes well on event day, it's thanks to you.",
      },
      {
        es: "Te encargas de la logística (salas, horarios, ponentes, imprevistos) para que todo fluya sin que nadie note el esfuerzo detrás.",
        en: "You handle the logistics (rooms, schedules, speakers, surprises) so everything flows without anyone noticing the effort behind it.",
      },
    ],
  },
];

export function DepartmentsSection() {
  const { t, language } = useTranslation();

  return (
    <section className="lp-departments" id="departamentos">
      <div className="lp-container">
        <span className="lp-eyebrow">{t.departments.eyebrow}</span>
        <h2 className="lp-heading">{t.departments.heading}</h2>
        <p className="lp-section-lead">{t.departments.lead}</p>

        <div className="lp-departments-grid">
          {DEPARTMENTS.map((dept) => (
            <article className="lp-department-card" key={dept.title.es}>
              <span className="lp-department-icon" aria-hidden="true">
                {dept.icon}
              </span>
              <h3>{dept.title[language]}</h3>
              <ul className="lp-department-lines">
                {dept.lines.map((line) => (
                  <li key={line.es}>{line[language]}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
