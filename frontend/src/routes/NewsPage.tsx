import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Bot, ChevronDown, Coins, Cpu, ExternalLink, Rocket, TrendingUp, type LucideIcon } from "lucide-react";

import { LandingFooter } from "../components/layout/LandingFooter";
import { LandingNav } from "../components/home/LandingNav";
import { agruparPorDia, fetchNoticias, relativo, TEMAS, type Dia, type Noticia, type Tema } from "../api/news";
import { useTranslation } from "../i18n/translations";

// La home pide lo mismo: la segunda petición sale de la caché HTTP (max-age=300).
export const DIAS = 7;
// ponytail: 100 cubre de sobra una semana (unas 30 noticias analizadas al día
// entran recortadas por el top de 05); si el muro crece, paginar por día.
export const LIMITE = 100;
const VISIBLES_POR_DIA = 6;

export const ICONO_TEMA: Record<Tema, LucideIcon> = {
  inversion: Coins,
  ia: Bot,
  startups: Rocket,
  finanzas: TrendingUp,
  tech: Cpu,
};

/** Enlace a una noticia concreta del muro: /news#noticia-<id> la abre y baja hasta ella. */
export const enlaceNoticia = (id: number) => `/news#noticia-${id}`;

type Estado = { fase: "cargando" } | { fase: "error" } | { fase: "listo"; noticias: Noticia[] };

export function NewsPage() {
  const { t, language } = useTranslation();
  const { hash } = useLocation();
  const objetivo = /^#noticia-(\d+)$/.exec(hash)?.[1];
  const idObjetivo = objetivo ? Number(objetivo) : null;
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const [tema, setTema] = useState<Tema | null>(null);
  const [intento, setIntento] = useState(0);
  // `n` hace que volver a pulsar el mismo día lo reabra aunque se hubiera plegado.
  const [salto, setSalto] = useState<Salto | null>(null);

  useEffect(() => {
    if (salto === null) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`dia-${salto.fecha}`)?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [salto]);

  useEffect(() => {
    if (idObjetivo === null) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [idObjetivo]);

  useEffect(() => {
    const ctrl = new AbortController();
    setEstado({ fase: "cargando" });
    fetchNoticias(DIAS, LIMITE, ctrl.signal)
      .then((noticias) => setEstado({ fase: "listo", noticias }))
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) {
          console.error("No se pudieron cargar las noticias", e);
          setEstado({ fase: "error" });
        }
      });
    return () => ctrl.abort();
  }, [intento]);

  // El navegador intenta bajar al ancla antes de que existan las noticias: se baja aquí.
  useEffect(() => {
    if (estado.fase !== "listo" || idObjetivo === null) return;
    // Instantáneo y tras pintar: el scroll suave de la web se cortaba a medio camino.
    const frame = requestAnimationFrame(() =>
      document.getElementById(`noticia-${idObjetivo}`)?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [estado, idObjetivo]);

  const dias = useMemo(
    () => (estado.fase === "listo" ? agruparPorDia(estado.noticias, tema) : []),
    [estado, tema],
  );

  const locale = language === "en" ? "en-GB" : "es-ES";

  return (
    <div className="lp-shell">
      <LandingNav />
      <main className="nw">
        <div className="nw-temas">
          <div className="lp-container nw-temas-fila">
            <div className="nw-temas-grupo" role="group" aria-label={t.news.temasLabel}>
              <button type="button" className="nw-tema-chip" aria-pressed={tema === null} onClick={() => setTema(null)}>
                {t.news.todas}
              </button>
              {TEMAS.map((id) => {
                const Icono = ICONO_TEMA[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={`nw-tema-chip nw-tema--${id}`}
                    aria-pressed={tema === id}
                    onClick={() => setTema(tema === id ? null : id)}
                  >
                    <Icono aria-hidden size={16} strokeWidth={2.25} />
                    {t.news.temas[id]}
                  </button>
                );
              })}
            </div>
            {dias.length > 1 && (
              <nav className="nw-semana" aria-label={t.news.semanaLabel}>
                {dias.map((dia) => (
                  <button
                    key={dia.fecha}
                    type="button"
                    className="nw-semana-dia"
                    onClick={() => setSalto((s) => ({ fecha: dia.fecha, n: (s?.n ?? 0) + 1 }))}
                  >
                    {etiquetaFecha(dia.fecha, locale, false)}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>

        {estado.fase === "cargando" && (
          <Portada fecha={null} locale={locale}>
            <p className="nw-estado" role="status">{t.news.cargando}</p>
          </Portada>
        )}

        {estado.fase === "error" && (
          <Portada fecha={null} locale={locale}>
            <div className="nw-estado" role="alert">
              <p>{t.news.error}</p>
              <button type="button" className="lp-btn lp-btn-gold" onClick={() => setIntento((n) => n + 1)}>
                {t.news.reintentar}
              </button>
            </div>
          </Portada>
        )}

        {estado.fase === "listo" && dias.length === 0 && (
          <Portada fecha={null} locale={locale}>
            <p className="nw-estado">
              {tema ? t.news.vacioTema.replace("{tema}", t.news.temas[tema]) : t.news.vacio}
            </p>
          </Portada>
        )}

        {dias.map((dia, i) => (
          <DiaFranja
            key={`${tema ?? "todas"}-${dia.fecha}`}
            dia={dia}
            primero={i === 0}
            locale={locale}
            idObjetivo={idObjetivo}
            salto={salto}
          />
        ))}

        <section className="nw-cierre">
          <div className="lp-container nw-cierre-inner">
            <p className="nw-aviso">{t.news.aviso}</p>
            <h2 className="lp-heading nw-cierre-titulo">{t.news.ctaTitulo}</h2>
            <p className="lp-section-lead">{t.news.ctaTexto}</p>
            <a href="/#inscripcion" className="lp-btn lp-btn-gold">
              {t.news.ctaBoton}
            </a>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

type Salto = { fecha: string; n: number };

function etiquetaFecha(fecha: string, locale: string, conMes = true) {
  // Mediodía UTC: la fecha es un día UTC y así ninguna zona horaria la mueve de día.
  const d = new Date(`${fecha}T12:00:00Z`);
  const parte = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...o, timeZone: "UTC" }).format(d).replace(".", "");
  const dia = `${parte({ weekday: "short" })} ${parte({ day: "numeric" })}`;
  return conMes ? `${dia} ${parte({ month: "short" })}` : dia;
}

function totalNoticias(n: number, t: ReturnType<typeof useTranslation>["t"]) {
  return n === 1 ? t.news.unaNoticia : t.news.noticias.replace("{n}", String(n));
}

/**
 * Franja azul de arriba. La fecha es el h1 (con el nombre de la página para
 * lectores de pantalla); sin fecha (cargando, error, vacío) el h1 es el título.
 */
function Portada({
  fecha,
  locale,
  total,
  children,
}: {
  fecha: string | null;
  locale: string;
  total?: number;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const rel = fecha ? relativo(fecha) : null;
  return (
    <section id={fecha ? `dia-${fecha}` : undefined} className="nw-dia nw-dia--hoy" aria-labelledby="nw-titulo">
      <div className="lp-container">
        <h1 id="nw-titulo" className="nw-fecha">
          {fecha ? (
            <>
              <span className="nw-sr">{t.news.title}: </span>
              {rel && <span className="nw-fecha-rel">{rel === "hoy" ? t.news.hoy : t.news.ayer}</span>}
              <span className="nw-fecha-dia">{etiquetaFecha(fecha, locale)}</span>
            </>
          ) : (
            t.news.title
          )}
        </h1>
        <p className="nw-lead">
          {total !== undefined && <strong>{totalNoticias(total, t)} · </strong>}
          {t.news.lead}
          {t.news.idiomaNota && ` ${t.news.idiomaNota}`}
        </p>
        {children}
      </div>
    </section>
  );
}

function DiaFranja({
  dia,
  primero,
  locale,
  idObjetivo,
  salto,
}: {
  dia: Dia;
  primero: boolean;
  locale: string;
  idObjetivo: number | null;
  salto: Salto | null;
}) {
  const { t } = useTranslation();
  const indiceObjetivo = idObjetivo === null ? -1 : dia.noticias.findIndex((n) => n.id === idObjetivo);
  const [abierto, setAbierto] = useState(primero || indiceObjetivo >= 0);
  useEffect(() => {
    if (salto?.fecha === dia.fecha) setAbierto(true);
  }, [salto, dia.fecha]);
  const [todas, setTodas] = useState(indiceObjetivo >= VISIBLES_POR_DIA);
  const [abierta, setAbierta] = useState<number | null>(
    indiceObjetivo >= 0 ? idObjetivo : primero ? dia.noticias[0]?.id ?? null : null,
  );
  const alternar = useCallback((id: number) => setAbierta((actual) => (actual === id ? null : id)), []);

  const visibles = todas ? dia.noticias : dia.noticias.slice(0, VISIBLES_POR_DIA);
  const ocultas = dia.noticias.length - visibles.length;

  const lista = (
    <ol className="nw-lista">
      {visibles.map((n) => (
        <NoticiaFila key={n.id} noticia={n} abierta={abierta === n.id} onAlternar={alternar} />
      ))}
      {ocultas > 0 && (
        <li className="nw-lista-mas">
          <button type="button" className="nw-ver-mas" onClick={() => setTodas(true)}>
            {t.news.verMas.replace("{n}", String(ocultas))}
            <ChevronDown aria-hidden size={18} strokeWidth={2.25} />
          </button>
        </li>
      )}
    </ol>
  );

  if (primero) {
    return (
      <Portada fecha={dia.fecha} locale={locale} total={dia.noticias.length}>
        {lista}
      </Portada>
    );
  }

  const rel = relativo(dia.fecha);
  const principal = dia.noticias[0];
  const panelId = `nw-dia-${dia.fecha}`;
  return (
    <section id={`dia-${dia.fecha}`} className={`nw-dia${abierto ? " is-open" : ""}`}>
      <div className="lp-container">
        <h2 className="nw-dia-titulo">
          <button
            type="button"
            className="nw-dia-boton"
            aria-expanded={abierto}
            aria-controls={panelId}
            onClick={() => setAbierto((a) => !a)}
          >
            <span className="nw-dia-fecha">
              {rel === "ayer" && <span className="nw-fecha-rel">{t.news.ayer}</span>}
              <span>{etiquetaFecha(dia.fecha, locale)}</span>
            </span>
            <span className="nw-dia-resumen">
              <span className="nw-dia-principal">{principal?.titular}</span>
              <span className="nw-dia-total">{totalNoticias(dia.noticias.length, t)}</span>
            </span>
            <ChevronDown className="nw-chevron" aria-hidden size={22} strokeWidth={2.25} />
          </button>
        </h2>
        <div id={panelId} className="nw-plegable" inert={!abierto}>
          <div>{lista}</div>
        </div>
      </div>
    </section>
  );
}

export function TemaPastilla({ tema }: { tema: Tema }) {
  const { t } = useTranslation();
  const Icono = ICONO_TEMA[tema];
  return (
    <span className={`nw-tema nw-tema--${tema}`}>
      <Icono aria-hidden size={13} strokeWidth={2.5} />
      {t.news.temas[tema]}
    </span>
  );
}

function NoticiaFila({
  noticia,
  abierta,
  onAlternar,
}: {
  noticia: Noticia;
  abierta: boolean;
  onAlternar: (id: number) => void;
}) {
  const { t } = useTranslation();
  const panelId = `nw-noticia-panel-${noticia.id}`;
  return (
    <li id={`noticia-${noticia.id}`} className={`nw-noticia${abierta ? " is-open" : ""}`}>
      <button
        type="button"
        className="nw-noticia-boton"
        aria-expanded={abierta}
        aria-controls={panelId}
        onClick={() => onAlternar(noticia.id)}
      >
        <span className="nw-noticia-titular">
          <TemaPastilla tema={noticia.tema} /> {noticia.titular}
        </span>
        <ChevronDown className="nw-chevron" aria-hidden size={20} strokeWidth={2.25} />
      </button>
      <div id={panelId} className="nw-plegable" inert={!abierta}>
        <div>
          <div className="nw-noticia-cuerpo">
            {noticia.por_que_importa && (
              <p className="nw-importa">
                <strong>{t.news.porQueImporta}:</strong> {noticia.por_que_importa}
              </p>
            )}
            {noticia.fuentes.length > 0 && (
              <ul className="nw-fuentes" aria-label={t.news.fuentes}>
                {noticia.fuentes.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="nw-fuente">
                      <span className="nw-fuente-medio">{f.medio ?? t.news.fuenteSinMedio}</span>
                      <span className="nw-fuente-titulo">{f.titulo}</span>
                      <ExternalLink aria-hidden size={16} strokeWidth={2.25} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {noticia.que_paso && (
              <p className="nw-paso">
                <strong>{t.news.quePaso}:</strong> {noticia.que_paso}
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
