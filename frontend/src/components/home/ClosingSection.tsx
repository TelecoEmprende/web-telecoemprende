import { ArrowUpRight } from "lucide-react";

import CircularText from "@/components/reactbits/CircularText";
import { WHATSAPP_COMUNIDAD } from "../../data/redes";
import { useTranslation } from "../../i18n/translations";
import { Aparece, Iman, TitularAnimado } from "./aparece";


/** Cierre de la home: comunidad de WhatsApp, Instagram y contacto. */
export function ClosingSection() {
  const { t } = useTranslation();

  return (
    <section className="in-seccion in-azul in-cierre" id="comunidad" aria-labelledby="cierre-titulo">
      <div className="in-wrap in-cierre-rejilla">
        <div>
          <Aparece como="p" className="in-etiqueta">{t.closing.eyebrow}</Aparece>
          <TitularAnimado id="cierre-titulo" className="in-titular in-titular-grande" texto={t.closing.heading} />
          <Aparece como="p" className="in-lead" retraso={0.2}>{t.closing.lead}</Aparece>

          <Aparece className="in-acciones" retraso={0.3}>
            <Iman>
              <a href={WHATSAPP_COMUNIDAD} className="in-btn in-btn-impulso" target="_blank" rel="noreferrer">
                {t.closing.whatsapp}
                <ArrowUpRight aria-hidden size={18} strokeWidth={2.25} />
              </a>
            </Iman>
            <a
              href="https://www.instagram.com/telecoemprende/"
              className="in-enlace in-enlace-claro"
              target="_blank"
              rel="noreferrer"
            >
              {t.closing.instagram}
              <ArrowUpRight aria-hidden size={18} strokeWidth={2.25} />
            </a>
          </Aparece>

          <p className="in-cierre-empresas">
            {t.closing.empresas}{" "}
            <a href="mailto:telecoemprende.etsit@upm.es">telecoemprende.etsit@upm.es</a>
          </p>
        </div>

        {/* Anillo de texto girando alrededor de un punto Impulso (CircularText de React Bits). Decorativo. */}
        <Aparece className="in-anillo" retraso={0.3}>
          <div aria-hidden="true">
            <CircularText text={t.closing.anillo} spinDuration={24} onHover="speedUp" className="in-anillo-texto" />
            <span className="in-anillo-punto" />
          </div>
        </Aparece>
      </div>
    </section>
  );
}
