import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { agruparPorDia, fetchNoticias, relativo, type Noticia } from "../../api/news";
import { useTranslation } from "../../i18n/translations";
import { DIAS, enlaceNoticia, LIMITE, TemaPastilla } from "../../routes/NewsPage";

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
    <section className="nw-portada" id="noticias" aria-labelledby="nw-portada-titulo" hidden={noticias.length === 0}>
      <div className="lp-container">
        <h2 id="nw-portada-titulo" className="lp-heading">{titulo}</h2>
        <p className="lp-section-lead">{t.latestNews.lead}</p>
        <ol className="nw-portada-lista">
          {noticias.map((n) => (
            <li key={n.id}>
              <a href={enlaceNoticia(n.id)} className="nw-portada-item">
                <span className="nw-portada-titular">
                  <TemaPastilla tema={n.tema} /> {n.titular}
                </span>
                {n.por_que_importa && <span className="nw-portada-importa">{n.por_que_importa}</span>}
              </a>
            </li>
          ))}
        </ol>
        <a href="/news" className="lp-btn lp-btn-gold nw-portada-cta">
          {t.latestNews.verTodas}
          <ArrowRight aria-hidden size={20} strokeWidth={2.5} />
        </a>
      </div>
    </section>
  );
}
