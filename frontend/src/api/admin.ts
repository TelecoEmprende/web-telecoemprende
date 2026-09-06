import { apiRequest } from "./client";
import type { AdminRegistrationsResponse, AdminSessionResponse, Estado } from "../types/admin";
import type { ApiResult } from "../types/api";
import type { Cargo, EquipoAcceso, EventoCalendario, Team } from "../types/equipo";

export function loginAdmin(password: string) {
  return apiRequest<ApiResult>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function logoutAdmin() {
  return apiRequest<ApiResult>("/api/admin/logout", {
    method: "POST",
  });
}

export function getAdminSession() {
  return apiRequest<AdminSessionResponse>("/api/admin/session");
}

export function getAdminRegistrations(evento?: string) {
  const qs = evento ? `?evento=${encodeURIComponent(evento)}` : "";
  return apiRequest<AdminRegistrationsResponse>(`/api/admin/registrations${qs}`);
}

export function updateRegistration(
  id: number,
  data: {
    nombre: string;
    apellidos: string;
    escuela: string;
    nivel: string;
    estudios: string;
    email: string;
    telefono: string;
    departamento: string;
    drive_link: string;
  },
) {
  return apiRequest<ApiResult>(`/api/admin/registrations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteRegistration(id: number) {
  return apiRequest<ApiResult>(`/api/admin/registrations/${id}`, {
    method: "DELETE",
  });
}

export function updateRegistrationEstado(id: number, estado: Estado) {
  return apiRequest<ApiResult>(`/api/admin/registrations/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export function enviarNotificaciones(estado: Estado) {
  return apiRequest<ApiResult & { total: number; enviados: number }>(
    "/api/admin/registrations/notificar",
    {
      method: "POST",
      body: JSON.stringify({ estado }),
    },
  );
}

export function getEquipoAccesos() {
  return apiRequest<ApiResult & { accesos: EquipoAcceso[] }>("/api/admin/equipo");
}

export function createEquipoAcceso(
  email: string,
  password: string,
  equipos: Team[],
  vp_de: Team[] = [],
  cargo: Cargo = "",
) {
  return apiRequest<ApiResult & { acceso: EquipoAcceso }>("/api/admin/equipo", {
    method: "POST",
    body: JSON.stringify({ email, password, equipos, vp_de, cargo }),
  });
}

export function updateEquipoAcceso(
  id: number,
  data: { equipos?: Team[]; vp_de?: Team[]; cargo?: Cargo; activo?: boolean; password?: string },
) {
  return apiRequest<ApiResult>(`/api/admin/equipo/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteEquipoAcceso(id: number) {
  return apiRequest<ApiResult>(`/api/admin/equipo/${id}`, {
    method: "DELETE",
  });
}

export function getCalendarioEventos() {
  return apiRequest<ApiResult & { eventos: EventoCalendario[] }>("/api/admin/calendario");
}

export function createCalendarioEvento(data: {
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
}) {
  return apiRequest<ApiResult & { evento: EventoCalendario }>("/api/admin/calendario", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCalendarioEvento(
  id: number,
  data: { titulo: string; descripcion: string; fecha: string; hora: string },
) {
  return apiRequest<ApiResult>(`/api/admin/calendario/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteCalendarioEvento(id: number) {
  return apiRequest<ApiResult>(`/api/admin/calendario/${id}`, {
    method: "DELETE",
  });
}
