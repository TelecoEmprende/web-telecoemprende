import { Fragment } from "react";

import { DEPTO_LABEL, TEAMS, type Team } from "../../types/equipo";
import type { BalanceDepartamento } from "../../types/marketing";

/** Cada departamento, con su color de marca (`tokens.css`): Marketing Impulso,
 *  Eventos Noche, Ingeniería Azul. */
const COLOR: Record<Team, string> = {
  marketing: "var(--color-depto-marketing)",
  eventos: "var(--color-depto-eventos)",
  ingenieria: "var(--color-depto-tech)",
};

const ORDINAL = ["1ª", "2ª", "3ª"];

/** Una tarta de reparto, con su leyenda: el mismo gráfico que la encuesta de
 *  1ª opción, pero con lo que hay en las cuentas. SVG a mano -- son tres
 *  números, no hace falta una librería de gráficas. */
function Tarta({ titulo, valores }: { titulo: string; valores: Record<Team, number> }) {
  const total = TEAMS.reduce((n, t) => n + valores[t], 0);
  // Cada trozo es un círculo de circunferencia 100 con un solo tramo pintado:
  // así el porcentaje es directamente la longitud del tramo.
  let acumulado = 0;
  const trozos = TEAMS.map((t) => {
    const pct = total === 0 ? 0 : (100 * valores[t]) / total;
    const desplazamiento = -acumulado;
    acumulado += pct;
    return { t, pct, desplazamiento };
  });

  return (
    <figure className="graf-tarta-react">
      <figcaption className="crm-k">{titulo}</figcaption>
      <svg
        viewBox="0 0 42 42"
        role="img"
        aria-label={`${titulo}: ${TEAMS.map((t) => `${DEPTO_LABEL[t]} ${valores[t]}`).join(", ")}`}
      >
        {total === 0 ? (
          <circle className="graf-tarta-vacia-react" cx="21" cy="21" r="15.9155" />
        ) : (
          <g transform="rotate(-90 21 21)">
            {trozos.map(({ t, pct, desplazamiento }) =>
              pct > 0 ? (
                <circle
                  key={t}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  strokeWidth="8"
                  stroke={COLOR[t]}
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={desplazamiento}
                />
              ) : null,
            )}
          </g>
        )}
      </svg>
      <ul className="graf-leyenda-react">
        {TEAMS.map((t) => (
          <li key={t}>
            <i style={{ background: COLOR[t] }} aria-hidden="true" />
            {DEPTO_LABEL[t]}
            <b>
              {valores[t]}
              {total > 0 ? ` · ${Math.round((100 * valores[t]) / total)}%` : ""}
            </b>
          </li>
        ))}
      </ul>
    </figure>
  );
}

type Barra = { etiqueta: string; pct: number; texto: string; opaca?: boolean };

function Barras({ barras }: { barras: Barra[] }) {
  return (
    <div className="graf-barras-react">
      {barras.map((b) => (
        <Fragment key={b.etiqueta}>
          <span className="graf-barras-etiqueta-react">{b.etiqueta}</span>
          <span className="graf-barras-pista-react" aria-hidden="true">
            <i
              className={b.opaca ? "is-suave" : undefined}
              style={{ transform: `scaleX(${Math.min(1, b.pct / 100)})` }}
            />
          </span>
          <span className="graf-barras-valor-react">{b.texto}</span>
        </Fragment>
      ))}
    </div>
  );
}

/** Cuántos puntos porcentuales más de trabajo que de gente que lo prefiere
 *  hacen falta para decir que el departamento «cojea». */
const MARGEN_COJERA = 15;

/**
 * ¿De qué pata cojea el club? Quién prefiere cada departamento (1ª, 2ª y 3ª
 * opción), frente a cuánto trabajo abierto tiene. Todo sale de las cuentas y de
 * las tareas; nada se teclea.
 */
export function GraficasClub({ balance }: { balance: Record<Team, BalanceDepartamento> }) {
  const porPosicion = (i: number) =>
    Object.fromEntries(TEAMS.map((t) => [t, balance[t].preferencias[i]])) as Record<Team, number>;

  const totalPrimera = TEAMS.reduce((n, t) => n + balance[t].preferencias[0], 0);
  const totalAbiertas = TEAMS.reduce((n, t) => n + balance[t].abiertas, 0);
  const totalVencidas = TEAMS.reduce((n, t) => n + balance[t].vencidas, 0);
  const pct = (n: number, total: number) => (total === 0 ? 0 : (100 * n) / total);

  const cojea = TEAMS.map((t) => ({
    t,
    gente: pct(balance[t].preferencias[0], totalPrimera),
    trabajo: pct(balance[t].abiertas, totalAbiertas),
  })).filter((d) => d.trabajo - d.gente >= MARGEN_COJERA);

  return (
    <div className="crm-c mkt-grupo-react">
      <h4 className="mkt-grupo-titulo-react">¿De qué pata cojea el club?</h4>
      <p className="mkt-meta-react">
        A la izquierda, a quién le apetece cada departamento (1ª, 2ª y 3ª opción de cada persona).
        Debajo, ese reparto contra el trabajo que hay abierto en cada uno.
      </p>

      <div className="graf-tartas-react">
        {ORDINAL.map((o, i) => (
          <Tarta key={o} titulo={`${o} opción`} valores={porPosicion(i)} />
        ))}
      </div>

      <h5 className="graf-subtitulo-react">Gente que lo prefiere (1ª) frente a trabajo abierto</h5>
      <div className="graf-comparativa-react">
        {TEAMS.map((t) => (
          <div key={t} className="graf-comparativa-fila-react">
            <span className="graf-comparativa-depto-react">
              <i style={{ background: COLOR[t] }} aria-hidden="true" />
              {DEPTO_LABEL[t]}
            </span>
            <Barras
              barras={[
                {
                  etiqueta: "La prefieren",
                  pct: pct(balance[t].preferencias[0], totalPrimera),
                  texto: `${Math.round(pct(balance[t].preferencias[0], totalPrimera))}%`,
                  opaca: true,
                },
                {
                  etiqueta: "Trabajo abierto",
                  pct: pct(balance[t].abiertas, totalAbiertas),
                  texto: `${balance[t].abiertas} · ${Math.round(pct(balance[t].abiertas, totalAbiertas))}%`,
                },
              ]}
            />
          </div>
        ))}
      </div>

      {cojea.length > 0 ? (
        <p className="graf-cojera-react">
          {cojea.map((d) => (
            <span key={d.t}>
              <strong>{DEPTO_LABEL[d.t]}</strong> tiene el {Math.round(d.trabajo)}% del trabajo y
              solo el {Math.round(d.gente)}% lo prefiere.{" "}
            </span>
          ))}
          Ahí cojea el club: conviene reforzarlo.
        </p>
      ) : totalAbiertas > 0 ? (
        <p className="mkt-meta-react">
          El trabajo abierto va parejo a lo que la gente prefiere: ningún departamento se queda
          cojo.
        </p>
      ) : null}

      <h5 className="graf-subtitulo-react">Tareas atrasadas por departamento</h5>
      {totalVencidas === 0 ? (
        <p className="mkt-meta-react">Ninguna tarea atrasada.</p>
      ) : (
        <Barras
          barras={TEAMS.map((t) => ({
            etiqueta: DEPTO_LABEL[t],
            pct: pct(balance[t].vencidas, Math.max(...TEAMS.map((x) => balance[x].vencidas))),
            texto: `${balance[t].vencidas}`,
          }))}
        />
      )}
    </div>
  );
}
