import { Search } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  placeholder: string;
  /** Nombre accesible del campo (por defecto, el placeholder). */
  etiqueta?: string;
  /** Recuento al lado («3 de 12»), solo mientras se busca. */
  cuenta?: ReactNode;
  autoFocus?: boolean;
};

/** El buscador de todos los apartados de /equipo: lupa dentro del campo y,
 *  si se pasa, el recuento de lo encontrado al lado. */
export function Buscador({ valor, onCambio, placeholder, etiqueta, cuenta, autoFocus }: Props) {
  return (
    <div className="crm-buscador-react">
      <label>
        <Search aria-hidden="true" />
        <input
          type="search"
          autoFocus={autoFocus}
          value={valor}
          placeholder={placeholder}
          aria-label={etiqueta ?? placeholder}
          onChange={(event) => onCambio(event.target.value)}
        />
      </label>
      {cuenta && valor.trim() ? (
        <span className="crm-buscador-cuenta-react" aria-live="polite">
          {cuenta}
        </span>
      ) : null}
    </div>
  );
}
