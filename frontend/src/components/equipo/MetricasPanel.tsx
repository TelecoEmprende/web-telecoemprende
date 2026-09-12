import { useEffect, useState } from "react";

import { getMetricas } from "../../api/equipo";
import { AlertBanner } from "../feedback/AlertBanner";
import { Esqueleto } from "../feedback/Esqueleto";
import { AvatarResponsable, etiquetaDe } from "./marketing/Avatares";
import type { ApiFailure } from "../../types/api";
import type { Team } from "../../types/equipo";
import type { MetricasClub, MiembroMetricas } from "../../types/marketing";

const DEPTO_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

/** Mismas clases que `Carga` en el directorio (`MembersPanel.tsx`): el
 *  semáforo de aquí no necesita un color nuevo, solo reutiliza libre/media/
 *  alta con el nombre que corresponde (verde/ámbar/rojo). */
const CLASE_NIVEL: Record<MiembroMetricas["nivel"], string> = {
  verde: "mkt-carga-react mkt-carga-libre-react",
  amarillo: "mkt-carga-react mkt-carga-media-react",
  rojo: "mkt-carga-react mkt-carga-alta-react",
};

function ordenSemana(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/**
 * Salud del club entero, para el board y los VPs de cada departamento.
 *
 * Mismo criterio que "Salud del equipo" en el resumen de cada departamento
 * (`WeekPanel`), pero cruzando los tres y con una fila por persona en vez de
 * solo el semáforo -- para eso está esta pantalla aparte y no un tile más
 * en "Mi semana". Todo sale de tareas reales; no hay puntuación inventada.
 */
export function MetricasPanel() {
  const [metricas, setMetricas] = useState<MetricasClub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getMetricas()
      .then((respuesta) => {
        if (activo) setMetricas(respuesta.metricas);
      })
      .catch((err) => {
        if (activo) {
          setError((err as ApiFailure)?.message || "No se pudieron cargar las métricas.");
        }
      })
      .finally(() => {
        if (activo) setIsLoading(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (isLoading) return <Esqueleto filas={6} />;
  if (error) return <AlertBanner variant="error" message={error} />;
  if (!metricas) return null;

  const maxSemanal = Math.max(1, ...metricas.participacion_semanal.map((s) => s.cerradas));

  return (
    <>
      <header className="equipo-panel-header-react">
        <h3>Salud del club</h3>
        <span className="mkt-meta-react">Últimos {metricas.dias_periodo} días</span>
      </header>

      <div className="mkt-tiles-react">
        <div className="mkt-tile-react">
          <span className="mkt-tile-numero-react">{metricas.total_activos}</span>
          <span className="mkt-tile-label-react">Miembros activos</span>
        </div>
        <div className={`mkt-tile-react${metricas.sobrecargados > 0 ? " mkt-tile-alerta-react" : ""}`}>
          <span className="mkt-tile-numero-react">{metricas.sobrecargados}</span>
          <span className="mkt-tile-label-react">Sobrecargados</span>
        </div>
        <div className={`mkt-tile-react${metricas.inactivos > 0 ? " mkt-tile-alerta-react" : ""}`}>
          <span className="mkt-tile-numero-react">{metricas.inactivos}</span>
          <span className="mkt-tile-label-react">Sin tarea hace +15 días</span>
        </div>
        <div className="mkt-tile-react">
          <span className="mkt-tile-numero-react">
            {metricas.pct_a_tiempo_club === null ? "—" : `${metricas.pct_a_tiempo_club}%`}
          </span>
          <span className="mkt-tile-label-react">
            {metricas.pct_a_tiempo_club === null ? "Sin datos suficientes" : "Tareas a tiempo"}
          </span>
        </div>
      </div>

      {(metricas.alertas_inactividad.length > 0 || metricas.alertas_departamento.length > 0) && (
        <div className="mkt-grupo-react">
          <h4 className="mkt-grupo-titulo-react">Alertas</h4>
          <ul className="mkt-miembros-react">
            {metricas.alertas_inactividad.map((m) => (
              <li key={m.email}>
                <span className="mkt-miembro-react">
                  <AvatarResponsable email={m.email} nombre={m.nombre} />
                  <span className="mkt-miembro-datos-react">
                    <span className="mkt-miembro-nombre-react">
                      {etiquetaDe(m.email, m.nombre)}
                    </span>
                    <span className="mkt-meta-react">
                      {m.dias_inactivo} días sin actividad · {DEPTO_LABEL[m.equipos[0]] ?? m.equipos[0]}
                    </span>
                  </span>
                </span>
              </li>
            ))}
            {metricas.alertas_departamento.map((a) => (
              <li key={a.departamento}>
                <span className="mkt-miembro-react">
                  <span className="mkt-miembro-datos-react">
                    <span className="mkt-miembro-nombre-react">{DEPTO_LABEL[a.departamento]}</span>
                    <span className="mkt-meta-react">
                      {a.dias_sin_cerrar === null
                        ? "Todavía no ha cerrado ninguna tarea"
                        : `${a.dias_sin_cerrar} días sin cerrar una tarea`}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mkt-grupo-react">
        <h4 className="mkt-grupo-titulo-react">Actividad por departamento</h4>
        {(Object.keys(metricas.por_departamento) as Team[]).map((depto) => {
          const salud = metricas.por_departamento[depto];
          const pct = salud.total === 0 ? 0 : Math.round(100 * (salud.total - salud.inactivos) / salud.total);
          return (
            <div key={depto} className="mkt-progreso-react mkt-progreso-azul-react">
              <span className="mkt-tile-label-react" style={{ width: 130, flex: "none" }}>
                {DEPTO_LABEL[depto]}
              </span>
              <div className="mkt-progreso-barra-react" aria-hidden="true">
                <span style={{ transform: `scaleX(${pct / 100})` }} />
              </div>
              <span className="mkt-progreso-texto-react">{pct}%</span>
            </div>
          );
        })}
      </div>

      {metricas.participacion_semanal.length > 0 ? (
        <div className="mkt-grupo-react">
          <h4 className="mkt-grupo-titulo-react">Participación semana a semana</h4>
          <p className="mkt-meta-react" style={{ marginBottom: 10 }}>
            Tareas cerradas por semana, en todo el club. Nadie lo teclea: sale solo de las
            tareas que se van cerrando.
          </p>
          {metricas.participacion_semanal.map((s) => (
            <div key={s.semana} className="mkt-progreso-react mkt-progreso-azul-react">
              <span className="mkt-tile-label-react" style={{ width: 60, flex: "none" }}>
                {ordenSemana(s.semana)}
              </span>
              <div className="mkt-progreso-barra-react" aria-hidden="true">
                <span style={{ transform: `scaleX(${s.cerradas / maxSemanal})` }} />
              </div>
              <span className="mkt-progreso-texto-react">{s.cerradas}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mkt-grupo-react">
        <h4 className="mkt-grupo-titulo-react">Productividad por persona</h4>
        {metricas.miembros.length === 0 ? (
          <p className="mkt-vacio-react">No hay miembros activos todavía.</p>
        ) : (
          <ul className="mkt-miembros-react">
            {metricas.miembros.map((m) => (
              <li key={m.email}>
                <span className="mkt-miembro-react">
                  <AvatarResponsable email={m.email} nombre={m.nombre} />
                  <span className="mkt-miembro-datos-react">
                    <span className="mkt-miembro-nombre-react">
                      {etiquetaDe(m.email, m.nombre)}
                    </span>
                    <span className="mkt-meta-react">
                      {m.completadas_periodo} cerradas
                      {m.pct_a_tiempo_periodo !== null ? ` · ${m.pct_a_tiempo_periodo}% a tiempo` : ""}
                      {" · "}
                      {m.abiertas} abiertas
                      {m.vencidas > 0 ? ` (${m.vencidas} vencidas)` : ""}
                    </span>
                  </span>
                  <span className={CLASE_NIVEL[m.nivel]}>
                    {m.nivel === "verde" ? "Al día" : m.nivel === "amarillo" ? "Vigilar" : "Atención"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
