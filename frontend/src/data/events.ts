type Bilingual = { es: string; en: string };

type ClubEvent = {
  id: string;
  title: string;
  tag: Bilingual;
  description?: Bilingual;
  photo: { src: string; alt: string };
};

/**
 * Eventos pasados que se muestran en la sección "Eventos" de la landing.
 *
 * Para añadir un evento nuevo:
 *  1. Copia la foto optimizada a `frontend/public/` (JPEG, ~1280px de ancho máx.).
 *  2. Añade un objeto a este array con título, etiqueta (`tag`), descripción
 *     opcional (`description`) en `es`/`en` y la foto de portada (`photo`).
 * La sección se renderiza sola a partir de este array.
 */
export const CLUB_EVENTS: ClubEvent[] = [
  {
    id: "blanca-cena-2026",
    title: "Blanca Ceña",
    tag: { es: "Entrevista", en: "Interview" },
    description: {
      es: "Blanca Ceña, CEO de FibreCo y antes al frente de Vantage Towers España, repasando con el club su carrera en las telecomunicaciones.",
      en: "Blanca Ceña, CEO of FibreCo and former head of Vantage Towers Spain, walking the club through her career in telecoms.",
    },
    photo: { src: "/evento-blanca-cena.jpg", alt: "Entrevista a Blanca Ceña con dos miembros del club ante los micrófonos" },
  },
  {
    id: "taxdown-2026",
    title: "TaxDown",
    tag: { es: "Charla con fundadores", en: "Talk with founders" },
    description: {
      es: "El equipo de TaxDown contando en la ETSIT cómo se construye una empresa de verdad: sin guion y con turno de preguntas.",
      en: "The TaxDown team at ETSIT explaining how to build a real company: no script, with a Q&A at the end.",
    },
    photo: { src: "/evento-taxdown.jpg", alt: "Charla de TaxDown con varios ponentes y micrófonos" },
  },
  {
    id: "ignacio-garcia-carrillo-2026",
    title: "Ignacio García Carrillo",
    tag: { es: "Charla con profesionales", en: "Talk with professionals" },
    description: {
      es: "Ignacio García Carrillo, Account Executive en AMD, compartiendo su visión del sector tecnológico con estudiantes de la ETSIT.",
      en: "Ignacio García Carrillo, Account Executive at AMD, sharing his view of the tech industry with ETSIT students.",
    },
    photo: { src: "/evento-ignacio-garcia-carrillo.jpg", alt: "Ignacio García Carrillo (AMD) junto al equipo de TelecoEmprende" },
  },
  {
    id: "samuel-gil-2026",
    title: "Samuel Gil",
    tag: { es: "Charla con inversores", en: "Talk with investors" },
    description: {
      es: "Samuel Gil, CEO de JME Ventures, hablando de inversión y ecosistema emprendedor con estudiantes de la ETSIT.",
      en: "Samuel Gil, CEO of JME Ventures, talking about investing and the startup ecosystem with ETSIT students.",
    },
    photo: { src: "/evento-samuel-gil.jpg", alt: "Charla de Samuel Gil, CEO de JME Ventures" },
  },
  {
    id: "cabify-2026",
    title: "Carlos Herrera · Cabify",
    tag: { es: "Charla con CTOs", en: "Talk with CTOs" },
    description: {
      es: "Carlos Herrera, CTO de Cabify, compartiendo cómo se escala una startup española hasta convertirla en referente.",
      en: "Carlos Herrera, CTO of Cabify, sharing how a Spanish startup scales into an industry reference.",
    },
    photo: { src: "/evento-cabify.jpg", alt: "Charla con Carlos Herrera, CTO de Cabify" },
  },
];
