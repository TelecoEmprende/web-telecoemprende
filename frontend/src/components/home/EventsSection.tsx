import { ArrowUpRight } from "lucide-react";

import { CLUB_EVENTS } from "../../data/events";
import { useTranslation } from "../../i18n/translations";
import { Aparece, TitularAnimado } from "./aparece";

const LUMA_EVENTOS = "https://luma.com/alumni.etsit.upm";

export function EventsSection() {
  const { t, language } = useTranslation();

  return (
    <section className="in-seccion in-azul" id="eventos" aria-labelledby="eventos-titulo">
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta">04 — {t.events.eyebrow}</Aparece>
        <TitularAnimado id="eventos-titulo" texto={t.events.heading} />
        <Aparece como="p" className="in-lead" retraso={0.15}>{t.events.lead}</Aparece>

        <ul className="in-eventos">
          {CLUB_EVENTS.map((event, i) => (
            <Aparece como="li" className="in-evento" key={event.id} retraso={(i % 3) * 0.08}>
              <div className="in-evento-foto">
                <img src={event.photo.src} alt={event.photo.alt} loading="lazy" />
              </div>
              <p className="in-evento-tag">{event.tag[language]}</p>
              <h3>{event.title}</h3>
              {event.description ? <p className="in-evento-texto">{event.description[language]}</p> : null}
            </Aparece>
          ))}

          <Aparece como="li" className="in-evento in-evento-proximo" retraso={0.16}>
            <p className="in-evento-tag">{t.events.proximoEtiqueta}</p>
            <h3>{t.events.proximoTitulo}</h3>
            <a href={LUMA_EVENTOS} className="in-enlace in-enlace-claro" target="_blank" rel="noreferrer">
              {t.events.proximoCta}
              <ArrowUpRight aria-hidden size={18} strokeWidth={2.25} />
            </a>
          </Aparece>
        </ul>
      </div>
    </section>
  );
}
