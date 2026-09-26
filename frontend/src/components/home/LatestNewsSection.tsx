import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { fetchNoticias, relativo, type Noticia } from "../../api/news";
import { useTranslation } from "../../i18n/translations";
import { enlaceNoticia, TemaPastilla } from "../../routes/NewsPage";

/** Las 3 noticias más relevantes del último día. Sin datos, la sección no se pinta. */
export function LatestNewsSection() {
  const { t } = useTranslation();
  const [noticias, setNoticias] = useState<Noticia[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    // La API ordena por día y relevancia: las 3 primeras son las top del último día.
    fetchNoticias(2, 3, ctrl.signal)
      .then((lista) => setNoticias(lista.filter((n) => n.fecha === lista[0]?.fecha)))
      .catch(() => setNoticias([])); // la landing no depende de la API
    return () => ctrl.abort();
  }, []);

  if (noticias.length === 0) return null;

  const rel = relativo(noticias[0].fecha);
  const titulo = rel === "hoy" ? t.latestNews.heading : rel === "ayer" ? t.latestNews.headingAyer : t.latestNews.headingUltimo;

  return (
    <section className="nw-portada" id="noticias" aria-labelledby="nw-portada-titulo">
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
