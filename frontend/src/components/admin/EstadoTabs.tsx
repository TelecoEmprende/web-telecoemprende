import type { Estado, Registro } from "../../types/admin";

export type EstadoFiltro = "todos" | Estado;

const ESTADO_LABELS: Record<EstadoFiltro, string> = {
  todos: "Todos",
  pendiente: "Pendientes",
  aceptado: "Aceptados",
  rechazado: "Rechazados",
  waitlist: "Waitlisteados",
};

// Color de la pastilla activa por estado. El resto de la pastilla (borde,
// tipografía, radio) es igual para todas, así que solo varía esto.
const ESTADO_ACTIVO_CLASS: Record<EstadoFiltro, string> = {
  todos: "border-[var(--color-navy)] bg-[var(--color-navy)] text-white",
  pendiente: "border-slate-500 bg-slate-500 text-white",
  aceptado:
    "border-[var(--color-success-text)] bg-[var(--color-success-text)] text-white",
  rechazado:
    "border-[var(--color-error-text)] bg-[var(--color-error-text)] text-white",
  waitlist: "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-navy)]",
};

const ORDEN: EstadoFiltro[] = ["todos", "pendiente", "aceptado", "rechazado", "waitlist"];

type EstadoTabsProps = {
  registros: Registro[];
  estadoActivo: EstadoFiltro;
  onEstadoChange: (estado: EstadoFiltro) => void;
};

export function EstadoTabs({ registros, estadoActivo, onEstadoChange }: EstadoTabsProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Estado de la inscripción">
      {ORDEN.map((estado) => {
        const count = estado === "todos" ? registros.length : registros.filter((r) => r.estado === estado).length;
        const activo = estadoActivo === estado;
        return (
          <button
            key={estado}
            type="button"
            role="tab"
            aria-selected={activo}
            className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm font-bold ${
              activo
                ? ESTADO_ACTIVO_CLASS[estado]
                : "border-[var(--color-paper-line)] bg-white text-muted-foreground"
            }`}
            onClick={() => onEstadoChange(estado)}
          >
            {ESTADO_LABELS[estado]} <span className="font-bold opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
