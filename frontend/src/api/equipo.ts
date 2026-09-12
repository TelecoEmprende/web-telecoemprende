import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type {
  EquipoLoginResponse,
  EquipoSessionResponse,
  EventoCalendario,
  Team,
} from "../types/equipo";
import type { CalendarioItem, Task } from "../types/marketing";

export function loginEquipo(email: string, password: string) {
  return apiRequest<EquipoLoginResponse>("/api/equipo/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** ponytail: alta temporal mientras entra el equipo (ver /api/equipo/registro). */
export function registrarEquipo(email: string, password: string) {
  return apiRequest<ApiResult>("/api/equipo/registro", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutEquipo() {
  return apiRequest<ApiResult>("/api/equipo/logout", {
    method: "POST",
  });
}

export function getEquipoSession() {
  return apiRequest<EquipoSessionResponse>("/api/equipo/session");
}

export function getEquipoCalendario() {
  return apiRequest<ApiResult & { eventos: EventoCalendario[] }>("/api/equipo/calendario");
}

/** Solo VPs (o admin) pueden llamarla -- ver `_puede_editar_calendario_club`
 *  en el backend. Editar/borrar sigue siendo cosa de /admin. */
export function createEquipoCalendarioEvento(data: {
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
}) {
  return apiRequest<ApiResult & { evento: EventoCalendario }>("/api/equipo/calendario", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Lectura cruzada entre departamentos, para el filtro "todos los
 *  departamentos" del calendario de un equipo (ver `CalendarPanel.tsx`). */
export function getCalendarioEquipo(desde: string, hasta: string, departamentos?: Team[]) {
  const qs = departamentos?.length ? `&departamentos=${departamentos.join(",")}` : "";
  return apiRequest<ApiResult & { desde: string; hasta: string; items: CalendarioItem[] }>(
    `/api/equipo/calendario-equipo?desde=${desde}&hasta=${hasta}${qs}`,
  );
}

export function getMisTareas() {
  return apiRequest<ApiResult & { tareas: Task[] }>("/api/equipo/mis-tareas");
}
