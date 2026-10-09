import { useEffect, useState } from "react";

import { getMiembrosWeb } from "../../api/equipo";
import type { MiembroWeb } from "../../types/equipo";

// Una sola petición por visita aunque la lean «El club» (la cifra) y «Equipo».
let peticion: Promise<MiembroWeb[]> | null = null;

/** Las personas de la sección «Equipo»: las cuentas de /equipo marcadas
 *  «Sale en la web». null mientras carga; [] si falla (la web sigue en pie). */
export function useMiembrosWeb() {
  const [miembros, setMiembros] = useState<MiembroWeb[] | null>(null);

  useEffect(() => {
    let activo = true;
    peticion ??= getMiembrosWeb()
      .then((r) => r.miembros)
      .catch(() => {
        peticion = null; // que la próxima visita lo reintente
        return [];
      });
    void peticion.then((lista) => {
      if (activo) setMiembros(lista);
    });
    return () => {
      activo = false;
    };
  }, []);

  return miembros;
}
