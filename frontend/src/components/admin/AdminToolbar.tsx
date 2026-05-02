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
      <div>
        <h1>Inscripciones registradas</h1>
        <p>
          Total actual: <strong>{total}</strong>
        </p>
      </div>

      <div className="admin-actions-react">
        <select
          className="secondary-btn-react evento-select-react"
          value={eventoActivo}
          onChange={(e) => onEventoChange(e.target.value)}
        >
          <option value="">Todos los eventos</option>
          {eventos.map((ev) => (
            <option key={ev} value={ev}>
              {ev}
            </option>
          ))}
        </select>

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
  );
}
