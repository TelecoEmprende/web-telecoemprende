import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiDepto, type ApiDepto } from "../../api/marketing";
import type { Team } from "../../types/equipo";

/** Departamento cuyo workspace se está pintando. Marketing y Eventos comparten
 *  paneles, y esto es lo único que los distingue. */
const DeptoContext = createContext<Team>("marketing");

export const DeptoProvider = DeptoContext.Provider;

export function useDepto(): Team {
  return useContext(DeptoContext);
}

/** El cliente de API ya atado al departamento actual. Los paneles lo usan en
 *  vez de importar funciones sueltas, así ninguno puede pedirle datos al
 *  departamento equivocado por olvidarse de pasar un argumento. */
export function useApi(): ApiDepto {
  const depto = useDepto();
  return useMemo(() => apiDepto(depto), [depto]);
}

/** email → nombre real del directorio de ESTE departamento. Se pide una sola
 *  vez por departamento y se comparte, en vez de que cada panel que pinta
 *  avatares (tareas, calendario, reuniones...) vuelva a pedir `getMiembros()`
 *  solo para tener con qué llamar a `etiquetaDe`. */
const DirectorioContext = createContext<Record<string, string>>({});

export function useDirectorio(): Record<string, string> {
  return useContext(DirectorioContext);
}

export function DirectorioProvider({ children }: { children: ReactNode }) {
  const { getMiembros } = useApi();
  const [directorio, setDirectorio] = useState<Record<string, string>>({});

  useEffect(() => {
    let activo = true;
    void getMiembros()
      .then((r) => {
        if (!activo) return;
        const mapa: Record<string, string> = {};
        for (const m of r.miembros) if (m.nombre.trim()) mapa[m.email] = m.nombre;
        setDirectorio(mapa);
      })
      .catch(() => {
        // Sin directorio, los avatares caen al nombre adivinado del email.
      });
    return () => {
      activo = false;
    };
  }, [getMiembros]);

  return <DirectorioContext.Provider value={directorio}>{children}</DirectorioContext.Provider>;
}
