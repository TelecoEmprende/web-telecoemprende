import { useEffect, useState } from "react";

import { getMiembrosClub } from "../../../api/marketing";
import { nombreCorto } from "../marketing/MembersPanel";
import type { Miembro } from "../../../types/marketing";

/** Quién lleva un proyecto: una sola persona del club, o nadie todavía. */
export function ResponsableSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (email: string) => void;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);

  useEffect(() => {
    let activo = true;
    void getMiembrosClub()
      .then((r) => {
        if (activo) setMiembros(r.miembros);
      })
      .catch(() => {
        // Sin lista no se puede elegir, pero el formulario sigue funcionando.
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sin responsable</option>
      {miembros
        .slice()
        .sort((a, b) => nombreCorto(a).localeCompare(nombreCorto(b)))
        .map((m) => (
          <option key={m.email} value={m.email}>
            {nombreCorto(m)}
          </option>
        ))}
      {/* Un responsable que ya no está entre los activos no se pierde al editar. */}
      {value && !miembros.some((m) => m.email === value) ? <option value={value}>{value}</option> : null}
    </select>
  );
}
