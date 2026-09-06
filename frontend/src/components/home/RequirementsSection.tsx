import { useTranslation } from "../../i18n/translations";

type Bilingual = { es: string; en: string };

const REQUIREMENTS: { icon: string; title: Bilingual; line: Bilingual; highlight: Bilingual }[] = [
  {
    icon: "📄",
    title: { es: "Un CV", en: "A CV" },
    line: {
      es: "Que muestre bien tus skills, tu experiencia y los proyectos que más te representen. No hace falta que sea perfecto, que sea tuyo.",
      en: "One that shows off your skills, experience and the projects that represent you best. It doesn't need to be perfect, just yours.",
    },
    highlight: {
      es: "No hace falta que sea perfecto, que sea tuyo.",
      en: "It doesn't need to be perfect, just yours.",
    },
  },
  {
    icon: "🎥",
    title: { es: "Un vídeo (máx. 2 min)", en: "A video (max. 2 min)" },
    line: {
      es: "Cuéntanos por qué quieres formar parte de TelecoEmprende y por qué deberíamos elegirte a ti. Vale una cámara del móvil, cuenta lo que dices.",
      en: "Tell us why you want to be part of TelecoEmprende and why we should pick you. A phone camera is fine, what matters is what you say.",
    },
    highlight: {
      es: "Vale una cámara del móvil, cuenta lo que dices.",
      en: "A phone camera is fine, what matters is what you say.",
    },
  },
];

/** Parte la frase en el trozo a subrayar y lo que queda alrededor. */
function partirLinea(linea: string, destacado: string) {
  const corte = linea.indexOf(destacado);
  if (corte === -1) return { antes: linea, destacado: "", despues: "" };
  return {
    antes: linea.slice(0, corte),
    destacado,
    despues: linea.slice(corte + destacado.length),
  };
}

export function RequirementsSection() {
  const { t, language } = useTranslation();

  return (
    <section className="lp-requirements" id="requisitos">
      <div className="lp-container">
        <span className="lp-eyebrow">{t.requirements.eyebrow}</span>
        <h2 className="lp-heading">{t.requirements.heading}</h2>
        <p className="lp-section-lead">{t.requirements.lead}</p>

        <div className="lp-requirements-grid">
          {REQUIREMENTS.map((req) => {
            const { antes, destacado, despues } = partirLinea(
              req.line[language],
              req.highlight[language],
            );

            return (
              <article className="lp-requirement-card" key={req.title.es}>
                <span className="lp-requirement-icon" aria-hidden="true">
                  {req.icon}
                </span>
                <h3>{req.title[language]}</h3>
                <p>
                  {antes}
                  {destacado && <mark className="lp-highlight">{destacado}</mark>}
                  {despues}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
