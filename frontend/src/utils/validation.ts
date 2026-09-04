import type { RegistrationErrors, RegistrationPayload } from "../types/registration";
import type { TranslationKey } from "../i18n/translations";

const UPM_EMAIL_PATTERN = /^[^@\s]+@(alumnos\.upm\.es|upm\.es)$/i;
const DRIVE_LINK_PATTERN = /^https?:\/\/(www\.)?drive\.google\.com\/.+/i;
const TELEFONO_PATTERN = /^\+?[0-9\s]{9,20}$/;

export function validateRegistrationDraft(
  payload: RegistrationPayload,
  t: TranslationKey,
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (!payload.nombre.trim()) {
    errors.nombre = t.validation.required;
  }
  if (!payload.apellidos.trim()) {
    errors.apellidos = t.validation.required;
  }
  if (!payload.escuela.trim() || !payload.estudios.trim()) {
    errors.estudios = t.validation.estudios;
  }
  if (!payload.departamento.trim()) {
    errors.departamento = t.validation.departamento;
  }
  if (!payload.email.trim()) {
    errors.email = t.validation.required;
  } else if (!UPM_EMAIL_PATTERN.test(payload.email.trim())) {
    errors.email = t.validation.emailFormat;
  }
  if (!payload.telefono.trim()) {
    errors.telefono = t.validation.required;
  } else if (!TELEFONO_PATTERN.test(payload.telefono.trim())) {
    errors.telefono = t.validation.telefonoFormat;
  }
  if (!payload.drive_link.trim()) {
    errors.drive_link = t.validation.required;
  } else if (!DRIVE_LINK_PATTERN.test(payload.drive_link.trim())) {
    errors.drive_link = t.validation.driveLinkFormat;
  }
  if (!payload.privacidad) {
    errors.privacidad = t.validation.privacidad;
  }

  return errors;
}
