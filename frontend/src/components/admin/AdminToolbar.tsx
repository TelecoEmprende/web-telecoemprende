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
    <div className="admin-toolbar-react">
      <div className="admin-toolbar-top-react">
        <div>
          <h1>Inscripciones registradas</h1>
          <p>
            Total actual: <strong>{total}</strong>
          </p>
        </div>

        <div className="admin-actions-react">
          <a href={downloadUrl} className="secondary-btn-react">
            Descargar Excel
          </a>
          <button
            type="button"
            className="secondary-btn-react secondary-btn-light-react"
            onClick={() => void onLogout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      </div>

      <div className="admin-evento-tabs-react" role="tablist" aria-label="Evento">
        <button
          type="button"
          role="tab"
          aria-selected={eventoActivo === ""}
          className={eventoActivo === "" ? "admin-tab-react admin-tab-active-react" : "admin-tab-react"}
          onClick={() => onEventoChange("")}
        >
          Todos los eventos
        </button>
        {eventos.map((ev) => (
          <button
            key={ev}
            type="button"
            role="tab"
            aria-selected={eventoActivo === ev}
            className={eventoActivo === ev ? "admin-tab-react admin-tab-active-react" : "admin-tab-react"}
            onClick={() => onEventoChange(ev)}
          >
            {eventoLabel(ev)}
          </button>
        ))}
      </div>
    </div>
  );
}
