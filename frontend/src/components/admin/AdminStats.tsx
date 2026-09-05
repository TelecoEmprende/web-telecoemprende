import { useMemo } from "react";

import type { Registro } from "../../types/admin";

type AdminStatsProps = {
  registros: Registro[];
};

function porcentaje(parte: number, total: number) {
  if (total === 0) return 0;
  return Math.round((parte / total) * 100);
}

function agruparPorDia(registros: Registro[]) {
  const porDia = new Map<string, number>();
  for (const r of registros) {
    const dia = r.fecha.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function agruparPor(registros: Registro[], campo: (r: Registro) => string) {
  const conteo = new Map<string, number>();
  for (const r of registros) {
    const clave = campo(r) || "Sin especificar";
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return [...conteo.entries()].sort(([, a], [, b]) => b - a);
}

/**
 * Panel de estadísticas del evento activo. Se calcula todo a partir de los
 * `registros` que llegan (ya filtrados por evento en AdminPage), así que
 * sirve igual para cualquier evento futuro sin tocar este componente.
 */
export function AdminStats({ registros }: AdminStatsProps) {
  const total = registros.length;

  const porEstado = useMemo(() => {
    const conteo: Record<string, number> = { pendiente: 0, aceptado: 0, rechazado: 0, waitlist: 0 };
    for (const r of registros) conteo[r.estado] = (conteo[r.estado] ?? 0) + 1;
    return conteo;
  }, [registros]);

  const pendientesNotificar = useMemo(
    () => registros.filter((r) => r.estado !== "pendiente" && !r.notificado).length,
    [registros],
  );

  const ultimas24h = useMemo(() => {
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    return registros.filter((r) => new Date(r.fecha.replace(" ", "T")).getTime() >= limite).length;
  }, [registros]);

  const porDia = useMemo(() => agruparPorDia(registros), [registros]);
  const maxDia = Math.max(1, ...porDia.map(([, count]) => count));

  const porDepartamento = useMemo(
    () => agruparPor(registros, (r) => r.departamento),
    [registros],
  );
  const porEscuela = useMemo(
    () => agruparPor(registros, (r) => r.escuela).slice(0, 6),
    [registros],
  );

  if (total === 0) return null;

  return (
    <div className="admin-stats-react">
      <div className="admin-stats-cards-react">
        <div className="admin-stat-card-react">
          <span className="admin-stat-value-react">{total}</span>
          <span className="admin-stat-label-react">Solicitudes totales</span>
        </div>
        <div className="admin-stat-card-react">
          <span className="admin-stat-value-react">{ultimas24h}</span>
          <span className="admin-stat-label-react">Últimas 24h</span>
        </div>
        <div className="admin-stat-card-react admin-stat-card-aceptado-react">
          <span className="admin-stat-value-react">{porEstado.aceptado}</span>
          <span className="admin-stat-label-react">Aceptados · {porcentaje(porEstado.aceptado, total)}%</span>
        </div>
        <div className="admin-stat-card-react admin-stat-card-waitlist-react">
          <span className="admin-stat-value-react">{porEstado.waitlist}</span>
          <span className="admin-stat-label-react">Waitlist · {porcentaje(porEstado.waitlist, total)}%</span>
        </div>
        <div className="admin-stat-card-react admin-stat-card-rechazado-react">
          <span className="admin-stat-value-react">{porEstado.rechazado}</span>
          <span className="admin-stat-label-react">Rechazados · {porcentaje(porEstado.rechazado, total)}%</span>
        </div>
        <div className="admin-stat-card-react admin-stat-card-pendiente-react">
          <span className="admin-stat-value-react">{pendientesNotificar}</span>
          <span className="admin-stat-label-react">Por notificar</span>
        </div>
      </div>

      <div className="admin-stats-charts-react">
        <div className="admin-chart-card-react admin-chart-time-react">
          <h2>Solicitudes en el tiempo</h2>
          <div
            className="admin-bars-react"
            role="img"
            aria-label={`Solicitudes por día, del ${porDia[0]?.[0]} al ${porDia[porDia.length - 1]?.[0]}`}
          >
            {porDia.map(([dia, count]) => (
              <span
                key={dia}
                className="admin-bar-react"
                style={{ height: `${Math.max(6, (count / maxDia) * 100)}%` }}
                title={`${dia}: ${count}`}
              />
            ))}
          </div>
        </div>

        <div className="admin-chart-card-react">
          <h2>Por departamento</h2>
          <ul className="admin-breakdown-react">
            {porDepartamento.map(([nombre, count]) => (
              <li key={nombre}>
                <span className="admin-breakdown-label-react">{nombre}</span>
                <span className="admin-breakdown-track-react">
                  <span
                    className="admin-breakdown-fill-react"
                    style={{ width: `${porcentaje(count, total)}%` }}
                  />
                </span>
                <span className="admin-breakdown-count-react">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-chart-card-react">
          <h2>Por escuela</h2>
          <ul className="admin-breakdown-react">
            {porEscuela.map(([nombre, count]) => (
              <li key={nombre}>
                <span className="admin-breakdown-label-react">{nombre}</span>
                <span className="admin-breakdown-track-react">
                  <span
                    className="admin-breakdown-fill-react"
                    style={{ width: `${porcentaje(count, total)}%` }}
                  />
                </span>
                <span className="admin-breakdown-count-react">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
