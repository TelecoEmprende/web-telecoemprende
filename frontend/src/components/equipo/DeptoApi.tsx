import { createContext, useContext, useMemo } from "react";

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
