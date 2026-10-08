type Bilingual = { es: string; en: string };

export type Recurso = {
  titulo: string;
  tipo: "video" | "curso" | "podcast" | "web";
  descripcion: Bilingual;
  url: string;
};

/**
 * Recursos recomendados de la sección "Recursos" de la home. Para añadir uno,
 * añade un objeto al array: la sección se pinta sola a partir de él.
 */
export const RECURSOS: Recurso[] = [
  {
    titulo: "Startup School",
    tipo: "curso",
    descripcion: {
      es: "El curso gratuito de Y Combinator para empezar una startup desde cero.",
      en: "Y Combinator's free course on starting a startup from scratch.",
    },
    url: "https://www.startupschool.org/",
  },
  {
    titulo: "Y Combinator",
    tipo: "video",
    descripcion: {
      es: "Charlas de fundadores y socios de YC sobre producto, equipo e inversión.",
      en: "Talks by founders and YC partners on product, team and fundraising.",
    },
    url: "https://www.youtube.com/@ycombinator",
  },
  {
    titulo: "Acquired",
    tipo: "podcast",
    descripcion: {
      es: "La historia completa de cómo se construyeron las grandes empresas tecnológicas.",
      en: "The full story of how the great tech companies were built.",
    },
    url: "https://www.acquired.fm/",
  },
  {
    titulo: "Ensayos de Paul Graham",
    tipo: "web",
    descripcion: {
      es: "Los textos del cofundador de YC que casi todo fundador ha leído alguna vez.",
      en: "The essays by YC's cofounder that nearly every founder has read.",
    },
    url: "https://paulgraham.com/articles.html",
  },
];
