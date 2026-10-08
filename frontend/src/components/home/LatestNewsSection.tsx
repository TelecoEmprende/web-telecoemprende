import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { agruparPorDia, fetchNoticias, relativo, type Noticia } from "../../api/news";
import { useTranslation } from "../../i18n/translations";
import { DIAS, enlaceNoticia, LIMITE, TemaPastilla } from "../../routes/NewsPage";
import { Aparece, TitularAnimado } from "./aparece";

/** Las 3 primeras del último día, en el mismo orden que el muro. Sin datos, la sección no se ve. */
export function LatestNewsSection() {
  const { t } = useTranslation();
  const [noticias, setNoticias] = useState<Noticia[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    // La misma petición que /news: si luego se entra al muro, sale de la caché.
    fetchNoticias(DIAS, LIMITE, ctrl.signal)
      .then((lista) => setNoticias(agruparPorDia(lista)[0]?.noticias.slice(0, 3) ?? []))
      .catch(() => setNoticias([])); // la landing no depende de la API
    return () => ctrl.abort();
  }, []);

  const rel = noticias[0] ? relativo(noticias[0].fecha) : null;
  const titulo = rel === "hoy" ? t.latestNews.heading : rel === "ayer" ? t.latestNews.headingAyer : t.latestNews.headingUltimo;

  // La sección existe siempre (oculta sin datos) para que el menú la observe desde el principio.
  return (
    <section className="in-seccion in-hueso" id="noticias" aria-labelledby="noticias-titulo" hidden={noticias.length === 0}>
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta in-etiqueta-directo">
          02 — {t.nav.noticias}
          <span className="in-directo">
            <span className="in-pulso" aria-hidden="true" />
            {t.latestNews.directo}
          </span>
        </Aparece>
        <TitularAnimado id="noticias-titulo" texto={titulo} key={titulo} />
        <Aparece como="p" className="in-lead" retraso={0.15}>{t.latestNews.lead}</Aparece>

        <ol className="in-noticias">
          {noticias.map((n, i) => (
            <Aparece como="li" key={n.id} retraso={i * 0.08}>
              <a href={enlaceNoticia(n.id)} className="in-noticia">
                <TemaPastilla tema={n.tema} />
                <span className="in-noticia-cuerpo">
                  <span className="in-noticia-titular">{n.titular}</span>
                  {n.por_que_importa && <span className="in-noticia-importa">{n.por_que_importa}</span>}
                </span>
                <ArrowRight className="in-noticia-flecha" aria-hidden size={22} strokeWidth={2} />
              </a>
            </Aparece>
          ))}
        </ol>

        <a href="/news" className="in-enlace">
          {t.latestNews.verTodas}
          <ArrowRight aria-hidden size={18} strokeWidth={2.25} />
        </a>
      </div>
    </section>
  );
}
