type AdminToolbarProps = {
  total: number;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
};

export function AdminToolbar({
  total,
  isLoggingOut,
  onLogout,
}: AdminToolbarProps) {
  return (
    <div className="admin-toolbar-react">
      <div>
        <h1>Inscripciones registradas</h1>
        <p>
          Total actual: <strong>{total}</strong>
        </p>
      </div>

      <div className="admin-actions-react">
        <a href="/api/admin/download" className="secondary-btn-react">
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
