import { ClipboardCopy, Search } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

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
      <div className="mb-4 flex items-start justify-between gap-[18px] max-[720px]:flex-col">
        <div>
          <h1 className="mb-1.5 text-[1.6rem] font-bold tracking-[-0.04em] max-[720px]:text-[1.4rem]">
            Inscripciones registradas
          </h1>
          <p className="text-[0.92rem] leading-[1.7] text-muted-foreground">
            {mostrados === total ? (
              <>
                Total actual: <strong>{total}</strong>
              </>
            ) : (
              <>
                <strong>{mostrados}</strong> de {total} inscripciones
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 max-[720px]:w-full">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 px-[18px] font-bold max-[720px]:w-full"
            disabled={emails === 0}
            onClick={onCopiarEmails}
            title="Copia los emails de las filas que estás viendo"
          >
            <ClipboardCopy />
            Copiar emails ({emails})
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-[18px] font-bold max-[720px]:w-full">
            <a href={downloadUrl}>Descargar Excel</a>
          </Button>
        </div>
      </div>

      <div className="mb-4 relative max-w-[420px] max-[720px]:max-w-none">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={busqueda}
          onChange={(event) => onBusquedaChange(event.target.value)}
          placeholder="Buscar por nombre, email, escuela..."
          aria-label="Buscar inscripciones"
          className="h-11 pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Evento">
        <EventoTab
          activo={eventoActivo === ""}
          onClick={() => onEventoChange("")}
          label="Todos los eventos"
        />
        {eventos.map((ev) => (
          <EventoTab
            key={ev}
            activo={eventoActivo === ev}
            onClick={() => onEventoChange(ev)}
            label={eventoLabel(ev)}
          />
        ))}
      </div>
    </div>
  );
}

function EventoTab({
  activo,
  label,
  onClick,
}: {
  activo: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm font-bold ${
        activo
          ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
          : "border-[var(--color-paper-line)] bg-white text-muted-foreground"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
