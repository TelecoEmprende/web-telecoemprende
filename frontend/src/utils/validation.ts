import type { RegistrationErrors, RegistrationPayload } from "../types/registration";

export function validateRegistrationDraft(
  payload: RegistrationPayload,
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (!payload.nombre.trim()) {
    errors.nombre = "Completa este campo.";
  }
  if (!payload.apellidos.trim()) {
    errors.apellidos = "Completa este campo.";
  }
  if (!payload.estudios.trim()) {
    errors.estudios = "Completa este campo.";
  }
  if (!payload.email.trim()) {
    errors.email = "Completa este campo.";
  }
  if (!payload.privacidad) {
    errors.privacidad = "Debes aceptar la politica de privacidad.";
  }

  return errors;
}
