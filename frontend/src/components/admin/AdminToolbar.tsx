import { ClipboardCopy } from "lucide-react";

import { CabeceraPanel } from "../equipo/CabeceraPanel";
import { Buscador } from "../equipo/Buscador";
import { motion, useReducedMotion } from "motion/react";
import { SPRING_DEFAULT } from "@/components/smoothui/lib/animation";

const EVENTO_LABELS: Record<string, string> = {
  "telecoemprende-2026-27": "Telecomprende inscripciones 26-27",
  "charla-santi-y-pablo": "Charla Santi y Pablo",
};

function eventoLabel(evento: string) {
  return EVENTO_LABELS[evento] ?? evento;
}

type AdminToolbarProps = {
  total: number;
  mostrados: number;
  eventos: string[];
  eventoActivo: string;
  busqueda: string;
  /** Cuántos emails copiaría el botón: los de las filas visibles. */
  emails: number;
  onBusquedaChange: (busqueda: string) => void;
  onCopiarEmails: () => void;
  onEventoChange: (evento: string) => void;
};

export function AdminToolbar({
  total,
  mostrados,
  eventos,
  eventoActivo,
  busqueda,
  emails,
  onBusquedaChange,
  onCopiarEmails,
  onEventoChange,
}: AdminToolbarProps) {
  const downloadUrl = eventoActivo
    ? `/api/admin/download?evento=${encodeURIComponent(eventoActivo)}`
    : "/api/admin/download";

  return (
    <div className="mb-5">
      <CabeceraPanel
        descripcion={
          mostrados === total ? (
            <>
              Las inscripciones recibidas (ya cerradas). Total actual: <strong>{total}</strong>
            </>
          ) : (
            <>
              <strong>{mostrados}</strong> de {total} inscripciones
            </>
          )
        }
      >
        <button
          type="button"
          className="crm-btn crm-btn-ghost-react crm-btn-icono-react"
          disabled={emails === 0}
          onClick={onCopiarEmails}
          title="Copia los emails de las filas que estás viendo"
        >
          <ClipboardCopy aria-hidden="true" />
          Copiar emails ({emails})
        </button>
        <a className="crm-btn crm-btn-ghost-react" href={downloadUrl}>
          Descargar Excel
        </a>
      </CabeceraPanel>

      <div className="my-4">
        <Buscador
          valor={busqueda}
          onCambio={onBusquedaChange}
          placeholder="Buscar por nombre, email, escuela..."
          etiqueta="Buscar inscripciones"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Evento">
        {["", ...eventos].map((ev) => (
          <EventoTab
            key={ev}
            activo={eventoActivo === ev}
            onClick={() => onEventoChange(ev)}
            label={ev === "" ? "Todos los eventos" : eventoLabel(ev)}
          />
        ))}
      </div>
    </div>
  );
}

/** Misma pastilla que las pestañas de estado (`EstadoTabs`), incluido el
 *  relleno que se desliza de una a otra: las dos filas viven una encima de
 *  la otra en la misma pantalla y tenían que seguir pareciéndose. */
function EventoTab({
  activo,
  label,
  onClick,
}: {
  activo: boolean;
  label: string;
  onClick: () => void;
}) {
  const menos = useReducedMotion();
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      className={`relative cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${
        activo
          ? "border-[var(--color-navy)] text-white"
          : "border-[var(--color-paper-line)] bg-white text-muted-foreground"
      }`}
      onClick={onClick}
    >
      {activo ? (
        <motion.span
          layoutId="evento-activo"
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[var(--color-navy)]"
          transition={menos ? { duration: 0 } : SPRING_DEFAULT}
        />
      ) : null}
      <span className="relative">{label}</span>
    </button>
  );
}
