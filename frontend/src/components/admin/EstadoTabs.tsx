import { motion, useReducedMotion } from "motion/react";

import { Contador } from "../movimiento";
import { SPRING_DEFAULT } from "@/components/smoothui/lib/animation";
import type { Estado, Registro } from "../../types/admin";

export type EstadoFiltro = "todos" | Estado;

const ESTADO_LABELS: Record<EstadoFiltro, string> = {
  todos: "Todos",
  pendiente: "Pendientes",
  aceptado: "Aceptados",
  rechazado: "Rechazados",
  waitlist: "Waitlisteados",
};

// Color de la pastilla activa por estado. Va partido en dos porque el fondo no
// lo pinta el botón: lo pinta una capa aparte que se desliza de una pestaña a
// otra (`layoutId`, abajo), así que el borde y el texto se quedan en el botón
// y solo el relleno viaja.
const ESTADO_ACTIVO_FONDO: Record<EstadoFiltro, string> = {
  todos: "bg-[var(--color-navy)]",
  pendiente: "bg-slate-500",
  aceptado: "bg-[var(--color-success-text)]",
  rechazado: "bg-[var(--color-error-text)]",
  waitlist: "bg-[var(--color-gold)]",
};

const ESTADO_ACTIVO_TRAZO: Record<EstadoFiltro, string> = {
  todos: "border-[var(--color-navy)] text-white",
  pendiente: "border-slate-500 text-white",
  aceptado: "border-[var(--color-success-text)] text-white",
  rechazado: "border-[var(--color-error-text)] text-white",
  waitlist: "border-[var(--color-gold)] text-[var(--color-navy)]",
};

const ORDEN: EstadoFiltro[] = ["todos", "pendiente", "aceptado", "rechazado", "waitlist"];

type EstadoTabsProps = {
  registros: Registro[];
  estadoActivo: EstadoFiltro;
  onEstadoChange: (estado: EstadoFiltro) => void;
};

export function EstadoTabs({ registros, estadoActivo, onEstadoChange }: EstadoTabsProps) {
  const menos = useReducedMotion();

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
            className={`relative cursor-pointer rounded-full border px-4 py-2.5 text-sm font-bold ${
              activo
                ? ESTADO_ACTIVO_TRAZO[estado]
                : "border-[var(--color-paper-line)] bg-white text-muted-foreground"
            }`}
            onClick={() => onEstadoChange(estado)}
          >
            {activo ? (
              <motion.span
                // El mismo `layoutId` en las cinco: el relleno no aparece y
                // desaparece, se desliza desde la pestaña que estaba activa.
                layoutId="estado-activo"
                aria-hidden="true"
                className={`absolute inset-0 rounded-full ${ESTADO_ACTIVO_FONDO[estado]}`}
                transition={menos ? { duration: 0 } : SPRING_DEFAULT}
              />
            ) : null}
            <span className="relative">
              {ESTADO_LABELS[estado]}{" "}
              <Contador valor={count} className="font-bold opacity-70" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
