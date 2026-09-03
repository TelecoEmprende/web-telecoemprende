import type { RegistrationErrors, RegistrationPayload } from "../types/registration";

const UPM_EMAIL_PATTERN = /^[^@\s]+@(alumnos\.upm\.es|upm\.es)$/i;
const DRIVE_LINK_PATTERN = /^https?:\/\/(www\.)?drive\.google\.com\/.+/i;
const TELEFONO_PATTERN = /^\+?[0-9\s]{9,20}$/;

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
  if (!payload.escuela.trim() || !payload.estudios.trim()) {
    errors.estudios = "Selecciona tu titulación.";
  }
  if (!payload.departamento.trim()) {
    errors.departamento = "Selecciona un departamento.";
  }
  if (!payload.email.trim()) {
    errors.email = "Completa este campo.";
  } else if (!UPM_EMAIL_PATTERN.test(payload.email.trim())) {
    errors.email = "Usa tu correo institucional de la UPM (@alumnos.upm.es o @upm.es).";
  }
  if (!payload.telefono.trim()) {
    errors.telefono = "Completa este campo.";
  } else if (!TELEFONO_PATTERN.test(payload.telefono.trim())) {
    errors.telefono = "Introduce un número de teléfono válido.";
  }
  if (!payload.drive_link.trim()) {
    errors.drive_link = "Completa este campo.";
  } else if (!DRIVE_LINK_PATTERN.test(payload.drive_link.trim())) {
    errors.drive_link = "Introduce un enlace de Google Drive válido.";
  }
  if (!payload.privacidad) {
    errors.privacidad = "Debes aceptar la política de privacidad.";
  }

  return errors;
}
