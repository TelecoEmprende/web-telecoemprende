import { ArrowUpRight } from "lucide-react";

import { RECURSOS } from "../../data/recursos";
import { useTranslation } from "../../i18n/translations";
import { Aparece, TitularAnimado } from "./aparece";

export function RecursosSection() {
  const { t, language } = useTranslation();

  return (
    <section className="in-seccion in-hueso" id="recursos" aria-labelledby="recursos-titulo">
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta">05 — {t.recursos.eyebrow}</Aparece>
        <TitularAnimado id="recursos-titulo" texto={t.recursos.heading} />
        <Aparece como="p" className="in-lead" retraso={0.15}>{t.recursos.lead}</Aparece>

        <ul className="in-recursos">
          {RECURSOS.map((recurso, i) => (
            <Aparece como="li" key={recurso.url} retraso={(i % 4) * 0.08}>
              <a href={recurso.url} className="in-recurso" target="_blank" rel="noreferrer">
                <p className="in-evento-tag">{t.recursos.tipos[recurso.tipo]}</p>
                <h3>
                  {recurso.titulo}
                  <ArrowUpRight aria-hidden size={20} strokeWidth={2.25} />
                </h3>
                <p className="in-evento-texto">{recurso.descripcion[language]}</p>
              </a>
            </Aparece>
          ))}
        </ul>
      </div>
    </section>
  );
}
