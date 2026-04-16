import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type { RegistrationPayload } from "../types/registration";

export function submitRegistration(payload: RegistrationPayload) {
  return apiRequest<ApiResult>("/api/registrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
