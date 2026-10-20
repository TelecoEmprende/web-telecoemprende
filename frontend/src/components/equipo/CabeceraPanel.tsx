import type { ReactNode } from "react";

type Props = {
  /** Qué es este apartado, en una frase. El título ya va en la barra superior. */
  descripcion: ReactNode;
  /** La acción principal (crear, descargar...), a la derecha. */
  children?: ReactNode;
};

/**
 * La primera fila de todo apartado de /equipo: descripción a la izquierda y
 * acción principal a la derecha. Debajo, si hay filtros, va una
 * `crm-barra-react`; luego el contenido. Así todos los apartados empiezan igual.
 */
export function CabeceraPanel({ descripcion, children }: Props) {
  return (
    <header className="crm-cabecera-react">
      {/* 60ch: con Inter, 72ch daba líneas de ~90 caracteres, demasiado largas. */}
      <p className="crm-s max-w-[60ch]">{descripcion}</p>
      {children ? <div className="crm-cabecera-acciones-react">{children}</div> : null}
    </header>
  );
}
