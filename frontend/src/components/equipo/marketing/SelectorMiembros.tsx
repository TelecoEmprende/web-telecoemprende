import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { useApi } from "../DeptoApi";
import { AvatarResponsable, etiquetaDe } from "./Avatares";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Miembro } from "../../../types/marketing";

type Props = {
  id?: string;
  seleccionados: string[];
  onCambiar: (emails: string[]) => void;
  placeholder?: string;
};

/**
 * Elegir personas del equipo por nombre y foto en vez de teclear su email de
 * memoria -- lo que se pedía hasta ahora en responsables de tarea/contenido y
 * asistentes de reunión. El roster sale de `getMiembros()`, el mismo que
 * pinta el panel de Miembros; si no carga, el campo se queda vacío en vez de
 * roto (no hay nada que elegir, pero el formulario sigue enviándose).
 */
export function SelectorMiembros({
  id,
  seleccionados,
  onCambiar,
  placeholder = "Elegir personas...",
}: Props) {
  const { getMiembros } = useApi();
  const [miembros, setMiembros] = useState<Miembro[]>([]);

  useEffect(() => {
    let activo = true;
    void getMiembros()
      .then((r) => activo && setMiembros(r.miembros))
      .catch(() => {
        // Sin roster no hay picker que ofrecer; no bloquea el formulario.
      });
    return () => {
      activo = false;
    };
  }, [getMiembros]);

  function alternar(email: string) {
    onCambiar(
      seleccionados.includes(email)
        ? seleccionados.filter((e) => e !== email)
        : [...seleccionados, email],
    );
  }

  function nombreDe(email: string) {
    return miembros.find((m) => m.email === email)?.nombre;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" id={id} className="mkt-selector-miembros-react">
          {seleccionados.length === 0 ? (
            <span className="mkt-selector-placeholder-react">{placeholder}</span>
          ) : (
            <span className="mkt-selector-elegidos-react">
              {seleccionados.map((email) => (
                <AvatarResponsable key={email} email={email} nombre={nombreDe(email)} />
              ))}
              <span className="mkt-selector-nombres-react">
                {seleccionados.map((email) => etiquetaDe(email, nombreDe(email))).join(", ")}
              </span>
            </span>
          )}
          <ChevronDown aria-hidden="true" size={16} className="mkt-selector-flecha-react" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="mkt-selector-contenido-react">
        {miembros.length === 0 ? (
          <p className="mkt-selector-vacio-react">Nadie en el equipo todavía.</p>
        ) : (
          <ul className="mkt-selector-lista-react">
            {miembros.map((m) => (
              <li key={m.email}>
                <label className="mkt-selector-fila-react">
                  <Checkbox
                    checked={seleccionados.includes(m.email)}
                    onCheckedChange={() => alternar(m.email)}
                  />
                  <AvatarResponsable email={m.email} nombre={m.nombre} />
                  <span>{etiquetaDe(m.email, m.nombre)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
