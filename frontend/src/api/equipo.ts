import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type {
  EquipoLoginResponse,
  EquipoSessionResponse,
  EventoCalendario,
  MiembroDirectorio,
  Team,
} from "../types/equipo";
import type { CalendarioItem, MetricasClub, ProyectoResumen, Task } from "../types/marketing";

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

/** "Quién es quién": el club entero, no solo el departamento desde el que se
 *  mira. Cualquiera con sesión de equipo puede pedirlo (ver el backend). */
export function getDirectorioClub() {
  return apiRequest<ApiResult & { miembros: MiembroDirectorio[] }>("/api/equipo/directorio");
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

/** Campañas (proyectos) de cualquier departamento donde la persona tiene una
 *  tarea, con su progreso -- para "Mis proyectos" en Mi semana. */
export function getMisProyectos() {
  return apiRequest<ApiResult & { proyectos: ProyectoResumen[] }>("/api/equipo/mis-proyectos");
}

/** "Voy" / "no voy" de la propia persona a un evento del club. */
export function confirmarEventoCalendario(eventoId: number, confirmar = true) {
  return apiRequest<ApiResult>(`/api/equipo/calendario/${eventoId}/confirmar`, {
    method: "POST",
    body: JSON.stringify({ confirmar }),
  });
}

/** Check-in el día del evento -- solo VP de cualquier departamento o admin
 *  (ver `_puede_editar_calendario_club` en el backend). */
export function checkinEventoCalendario(eventoId: number, email: string, asistio = true) {
  return apiRequest<ApiResult>(`/api/equipo/calendario/${eventoId}/checkin`, {
    method: "POST",
    body: JSON.stringify({ email, asistio }),
  });
}

/** Solo board/VP (ver `_es_board_o_vp` en el backend) -- 403 para cualquier
 *  otra persona. `MetricasPanel` no la llama si la sesión no cumple. */
export function getMetricas(diasPeriodo = 30) {
  return apiRequest<ApiResult & { metricas: MetricasClub }>(
    `/api/equipo/metricas?dias=${diasPeriodo}`,
  );
}

export type DatosFormulario = {
  nombre: string;
  apellidos: string;
  dni: string;
  correo: string;
  foto: string;
};

/** Ficha de datos personales de la propia persona (`/equipo/datosformulario`). */
export function getDatosFormulario() {
  return apiRequest<ApiResult & DatosFormulario & { email: string }>("/api/equipo/datos-formulario");
}

/** Sin `foto` se conserva la que ya había guardada. */
export function guardarDatosFormulario(datos: Omit<DatosFormulario, "foto"> & { foto?: string }) {
  return apiRequest<ApiResult>("/api/equipo/datos-formulario", {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}
