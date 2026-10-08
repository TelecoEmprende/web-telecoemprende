import { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

import { Contador } from "@/components/movimiento";
import { CLUB_EVENTS } from "../../data/events";
import { useTranslation } from "../../i18n/translations";
import { ScrollRevealText } from "./ScrollRevealText";
import { TEAM } from "./TeamSection";
import { Aparece, TitularAnimado } from "./aparece";

export function AboutSection() {
  const { t } = useTranslation();
  const menos = useReducedMotion();
  const cifrasRef = useRef<HTMLDListElement>(null);
  // Las cifras ruedan desde 0 la primera vez que entran en pantalla.
  const visibles = useInView(cifrasRef, { once: true, margin: "0px 0px -20% 0px" }) || menos;

  const pilares = [
    { titulo: t.about.pilar1Titulo, texto: t.about.pilar1Texto },
    { titulo: t.about.pilar2Titulo, texto: t.about.pilar2Texto },
    { titulo: t.about.pilar3Titulo, texto: t.about.pilar3Texto },
  ];

  // Solo cifras que salen de los datos de la web: nada inventado.
  const cifras = [
    { valor: CLUB_EVENTS.length, texto: t.about.cifraEventos },
    { valor: TEAM.length, texto: t.about.cifraEquipo },
    { valor: 3, texto: t.about.cifraDeptos },
  ];

  return (
    <section className="in-seccion" id="quienes-somos" aria-labelledby="club-titulo">
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta">01 — {t.about.eyebrow}</Aparece>

        <div className="in-club-intro">
          <TitularAnimado id="club-titulo" texto={t.about.heading} />
          <ScrollRevealText text={t.about.lead} className="in-club-lead" />
        </div>

        <ol className="in-pilares" aria-label={t.about.pilaresLabel}>
          {pilares.map((pilar, i) => (
            <Aparece como="li" key={pilar.titulo} retraso={i * 0.08}>
              <span className="in-pilar-num">0{i + 1}</span>
              <h3>{pilar.titulo}</h3>
              <p>{pilar.texto}</p>
            </Aparece>
          ))}
        </ol>

        <dl className="in-cifras" ref={cifrasRef} aria-label={t.about.cifrasLabel}>
          {cifras.map((cifra) => (
            <div key={cifra.texto}>
              <dt>{cifra.texto}</dt>
              <dd>
                <Contador valor={visibles ? cifra.valor : 0} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
