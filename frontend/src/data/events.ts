type Bilingual = { es: string; en: string };

export type ClubEventPhoto = {
  src: string;
  alt: string;
};

export type ClubEvent = {
  id: string;
  title: string;
  tag: Bilingual;
  description?: Bilingual;
  photos: ClubEventPhoto[];
  companyLogo?: { src: string; alt: string };
};

/**
 * Eventos pasados que se muestran en la sección "Eventos" de la landing.
 *
 * Para añadir un evento nuevo:
 *  1. Copia las fotos optimizadas a `frontend/public/` (JPEG, ~1280px de ancho máx.).
 *  2. Añade un objeto a este array con título, etiqueta (`tag`) y descripción
 *     (`description`) en `es`/`en`, y sus fotos (la primera foto es la
 *     portada de la tarjeta).
 * La sección se renderiza sola a partir de este array, mostrando las
 * tarjetas en una cuadrícula simétrica de igual tamaño.
 */
export const CLUB_EVENTS: ClubEvent[] = [
  {
    id: "taxdown-2026",
    title: "TaxDown",
    tag: { es: "Charla con fundadores", en: "Talk with founders" },
    description: {
      es: "El equipo de TaxDown contando en la ETSIT cómo se construye una empresa de verdad: sin guion y con turno de preguntas.",
      en: "The TaxDown team at ETSIT explaining how to build a real company: no script, with a Q&A at the end.",
    },
    photos: [
      { src: "/evento-taxdown.jpg", alt: "Charla de TaxDown con varios ponentes y micrófonos" },
    ],
    companyLogo: { src: "/logo-taxdown.svg", alt: "Logo de TaxDown" },
  },
  {
    id: "ignacio-garcia-carrillo-2026",
    title: "Ignacio García Carrillo",
    tag: { es: "Charla con profesionales", en: "Talk with professionals" },
    description: {
      es: "Ignacio García Carrillo, Account Executive en AMD, compartiendo su visión del sector tecnológico con estudiantes de la ETSIT.",
      en: "Ignacio García Carrillo, Account Executive at AMD, sharing his view of the tech industry with ETSIT students.",
    },
    photos: [
      {
        src: "/evento-ignacio-garcia-carrillo.jpg",
        alt: "Ignacio García Carrillo (AMD) junto al equipo de TelecoEmprende",
      },
    ],
    companyLogo: { src: "/logo-amd.svg", alt: "Logo de AMD" },
  },
  {
    id: "samuel-gil-2026",
    title: "Samuel Gil",
    tag: { es: "Charla con inversores", en: "Talk with investors" },
    description: {
      es: "Samuel Gil, CEO de JME Ventures, hablando de inversión y ecosistema emprendedor con estudiantes de la ETSIT.",
      en: "Samuel Gil, CEO of JME Ventures, talking about investing and the startup ecosystem with ETSIT students.",
    },
    photos: [
      { src: "/evento-samuel-gil.jpg", alt: "Charla de Samuel Gil, CEO de JME Ventures" },
    ],
    companyLogo: { src: "/logo-jme.jpg", alt: "Logo de JME Ventures" },
  },
  {
    id: "cabify-2026",
    title: "Carlos Herrera · Cabify",
    tag: { es: "Charla con CTOs", en: "Talk with CTOs" },
    description: {
      es: "Carlos Herrera, CTO de Cabify, compartiendo cómo se escala una startup española hasta convertirla en referente.",
      en: "Carlos Herrera, CTO of Cabify, sharing how a Spanish startup scales into an industry reference.",
    },
    photos: [
      { src: "/evento-cabify.jpg", alt: "Charla con Carlos Herrera, CTO de Cabify" },
    ],
    companyLogo: { src: "/logo-cabify.svg", alt: "Logo de Cabify" },
  },
];
