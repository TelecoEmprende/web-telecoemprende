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

export function getAdminRegistrations() {
  return apiRequest<AdminRegistrationsResponse>("/api/admin/registrations");
}
