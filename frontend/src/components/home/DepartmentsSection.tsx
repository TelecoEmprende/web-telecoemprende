import { Plus } from "lucide-react";

import { useTranslation } from "../../i18n/translations";
import { Aparece, TitularAnimado } from "./aparece";

type Bilingual = { es: string; en: string };

type Department = {
  /** Cada departamento tiene su color en la guía de marca (ver tokens.css). */
  depto: "tech" | "marketing" | "eventos";
  title: Bilingual;
  lines: [Bilingual, Bilingual, Bilingual];
};

const DEPARTMENTS: Department[] = [
  {
    depto: "tech",
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
    depto: "marketing",
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
    depto: "eventos",
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
    <section className="in-seccion" id="departamentos" aria-labelledby="deptos-titulo">
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta">03 — {t.departments.eyebrow}</Aparece>
        <TitularAnimado id="deptos-titulo" texto={t.departments.heading} />
        <Aparece como="p" className="in-lead" retraso={0.15}>{t.departments.lead}</Aparece>

        {/* Acordeón nativo: teclado y lector de pantalla gratis, sin estado. */}
        <Aparece className="in-deptos" retraso={0.2}>
          {DEPARTMENTS.map((dept) => (
            <details className="in-depto" data-depto={dept.depto} key={dept.depto}>
              <summary>
                <span className="in-depto-punto" aria-hidden="true" />
                <h3>{dept.title[language]}</h3>
                <Plus className="in-depto-mas" aria-hidden size={28} strokeWidth={1.75} />
              </summary>
              <ul>
                {dept.lines.map((line) => (
                  <li key={line.es}>{line[language]}</li>
                ))}
              </ul>
            </details>
          ))}
        </Aparece>
      </div>
    </section>
  );
}
