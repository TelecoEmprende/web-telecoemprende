import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type { EquipoLoginResponse, EquipoSessionResponse } from "../types/equipo";

export function loginEquipo(email: string, password: string) {
  return apiRequest<EquipoLoginResponse>("/api/equipo/login", {
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
