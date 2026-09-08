type AlertBannerProps = {
  variant: "info" | "success" | "error";
  message: string;
  /** Botón inline opcional, p. ej. "Deshacer" tras una acción reversible. */
  action?: { label: string; onClick: () => void };
};

export function AlertBanner({ variant, message, action }: AlertBannerProps) {
  return (
    <div className={`alert-banner alert-${variant}`}>
      <span>{message}</span>
      {action ? (
        <button type="button" className="alert-banner__accion" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
