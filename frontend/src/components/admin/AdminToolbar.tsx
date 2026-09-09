import { Button } from "../ui/button";

const EVENTO_LABELS: Record<string, string> = {
  "telecoemprende-2026-27": "Telecomprende inscripciones 26-27",
  "charla-santi-y-pablo": "Charla Santi y Pablo",
};

function eventoLabel(evento: string) {
  return EVENTO_LABELS[evento] ?? evento;
}

type AdminToolbarProps = {
  total: number;
  eventos: string[];
  eventoActivo: string;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
  onEventoChange: (evento: string) => void;
};

export function AdminToolbar({
  total,
  eventos,
  eventoActivo,
  isLoggingOut,
  onLogout,
  onEventoChange,
}: AdminToolbarProps) {
  const downloadUrl = eventoActivo
    ? `/api/admin/download?evento=${encodeURIComponent(eventoActivo)}`
    : "/api/admin/download";

  return (
    <div className="mt-2 mb-5">
      <div className="mb-5 flex items-start justify-between gap-[18px] max-[720px]:mb-[18px] max-[720px]:flex-col">
        <div>
          <h1 className="mb-2.5 text-[2rem] font-bold tracking-[-0.04em] max-[720px]:text-[1.7rem]">
            Inscripciones registradas
          </h1>
          <p className="leading-[1.7] text-muted-foreground max-[720px]:text-[0.96rem]">
            Total actual: <strong>{total}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 max-[720px]:w-full">
          <Button asChild variant="outline" size="lg" className="h-12 px-[18px] font-bold max-[720px]:w-full">
            <a href={downloadUrl}>Descargar Excel</a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 bg-[var(--color-paper)] px-[18px] font-bold max-[720px]:w-full"
            onClick={() => void onLogout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
          </Button>
        </div>
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
