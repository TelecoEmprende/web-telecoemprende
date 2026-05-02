import { apiRequest } from "./client";
import type { AdminRegistrationsResponse, AdminSessionResponse } from "../types/admin";
import type { ApiResult } from "../types/api";

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
  data: { nombre: string; apellidos: string; estudios: string; email: string },
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
