import type { Estado, Registro } from "../../types/admin";

export type EstadoFiltro = "todos" | Estado;

const ESTADO_LABELS: Record<EstadoFiltro, string> = {
  todos: "Todos",
  pendiente: "Pendientes",
  aceptado: "Aceptados",
  rechazado: "Rechazados",
  waitlist: "Waitlisteados",
};

const ORDEN: EstadoFiltro[] = ["todos", "pendiente", "aceptado", "rechazado", "waitlist"];

type EstadoTabsProps = {
  registros: Registro[];
  estadoActivo: EstadoFiltro;
  onEstadoChange: (estado: EstadoFiltro) => void;
};

export function EstadoTabs({ registros, estadoActivo, onEstadoChange }: EstadoTabsProps) {
  return (
    <div className="admin-estado-tabs-react" role="tablist" aria-label="Estado de la inscripción">
      {ORDEN.map((estado) => {
        const count = estado === "todos" ? registros.length : registros.filter((r) => r.estado === estado).length;
        return (
          <button
            key={estado}
            type="button"
            role="tab"
            aria-selected={estadoActivo === estado}
            className={
              estadoActivo === estado
                ? `admin-estado-tab-react admin-estado-tab-active-react admin-estado-tab-${estado}-react`
                : `admin-estado-tab-react admin-estado-tab-${estado}-react`
            }
            onClick={() => onEstadoChange(estado)}
          >
            {ESTADO_LABELS[estado]} <span className="admin-estado-tab-count-react">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
