import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type { EquipoLoginResponse, EquipoSessionResponse, EventoCalendario } from "../types/equipo";
import type { Task } from "../types/marketing";

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

export function getMisTareas() {
  return apiRequest<ApiResult & { tareas: Task[] }>("/api/equipo/mis-tareas");
}
