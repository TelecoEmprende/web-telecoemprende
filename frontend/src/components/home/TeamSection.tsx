import { useTranslation } from "../../i18n/translations";
import { Aparece, TitularAnimado } from "./aparece";

type Bilingual = { es: string; en: string };

type TeamMember = {
  name: string;
  alias?: string;
  photo: string;
  role: Bilingual;
  program: string;
  line: Bilingual;
};

export const TEAM: TeamMember[] = [
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
    photo: "/equipo-david-garcia.jpg",
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

export function TeamSection() {
  const { t, language } = useTranslation();

  return (
    <section className="in-seccion" id="equipo" aria-labelledby="equipo-titulo">
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta">06 — {t.team.eyebrow}</Aparece>
        <TitularAnimado id="equipo-titulo" texto={t.team.heading} />

        <ul className="in-equipo">
          {TEAM.map((member, i) => (
            <Aparece como="li" className="in-persona" key={member.name} retraso={(i % 4) * 0.07}>
              <img src={member.photo} alt={`${t.team.photoAlt} ${member.name}`} loading="lazy" />
              <h3>{member.name}</h3>
              <p>{member.role[language]}</p>
              <p className="in-persona-programa">{member.program}</p>
            </Aparece>
          ))}
        </ul>
      </div>
    </section>
  );
}
