import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type { ElementoPapelera, EntidadClub, EventoHistorial, Mesa } from "../types/club";

const BASE = "/api/equipo";

/** Lo que hay sobre la mesa en la reunión semanal, y lo último que se ha
 *  movido en el club. */
export const getMesa = () =>
  apiRequest<ApiResult & { mesa: Mesa; actividad: EventoHistorial[] }>(`${BASE}/mesa`);

/** Historial de una cosa (`entidad` + `id`), de un proyecto y todo lo que
 *  cuelga de él (`proyecto_id`), o lo último del club. */
export function getHistorial(filtros: {
  entidad?: EntidadClub;
  id?: number;
  proyecto_id?: number;
  limite?: number;
}) {
  const qs = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined) qs.set(clave, String(valor));
  }
  return apiRequest<ApiResult & { eventos: EventoHistorial[] }>(`${BASE}/historial?${qs}`);
}

export const getPapelera = () =>
  apiRequest<ApiResult & { dias: number; elementos: ElementoPapelera[] }>(`${BASE}/papelera`);

export const restaurar = (entidad: EntidadClub, id: number) =>
  apiRequest<ApiResult>(`${BASE}/papelera/${entidad}/${id}/restaurar`, { method: "POST" });

/** Borrado definitivo (solo admin). */
export const borrarParaSiempre = (entidad: EntidadClub, id: number) =>
  apiRequest<ApiResult>(`${BASE}/papelera/${entidad}/${id}`, { method: "DELETE" });
