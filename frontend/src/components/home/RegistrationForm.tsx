import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { submitRegistration } from "../../api/public";
import { AlertBanner } from "../feedback/AlertBanner";
import type { ApiFailure } from "../../types/api";
import type { RegistrationErrors, RegistrationPayload } from "../../types/registration";
import { validateRegistrationDraft } from "../../utils/validation";

const INITIAL_FORM: RegistrationPayload = {
  nombre: "",
  apellidos: "",
  estudios: "",
  email: "",
  privacidad: false,
  telefono_oculto: "",
};

export function RegistrationForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationPayload>(INITIAL_FORM);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof RegistrationPayload>(
    field: K,
    value: RegistrationPayload[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateRegistrationDraft(form);
    setErrors(nextErrors);
    setMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitRegistration(form);

      if (response.ok) {
        setForm(INITIAL_FORM);
        setErrors({});
        navigate("/gracias", {
          state: {
            attendeeName: form.nombre.trim(),
            attendeeEmail: form.email.trim(),
          },
        });
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessage(apiError.message || "No se pudo completar el registro.");
      if (apiError.errors) {
        setErrors((current) => ({ ...current, ...apiError.errors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="form-section-react" id="registro">
      <div className="container-react form-layout-react">
        <div className="section-copy-card-react">
          <span className="section-eyebrow-react">Inscripción</span>
          <h2>Formulario de registro Día 1 - Charla con Carlos</h2>
          <p className="section-copy">
            Completa tus datos para reservar tu plaza. Usaremos esta
            información únicamente para la gestión del evento y las
            comunicaciones relacionadas.
          </p>
        </div>

        <div className="form-card-react">
          {message ? (
            <AlertBanner
              variant="error"
              message={message}
            />
          ) : null}

          <form className="registration-form-react" noValidate onSubmit={handleSubmit}>
            <input
              type="text"
              name="telefono_oculto"
              tabIndex={-1}
              autoComplete="off"
              className="honeypot-input-react"
              value={form.telefono_oculto ?? ""}
              onChange={(event) => updateField("telefono_oculto", event.target.value)}
            />

            <div className="field-grid-react">
              <div className="field-group-react">
                <label htmlFor="nombre">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  placeholder="Ej. Juan"
                  maxLength={60}
                  value={form.nombre}
                  onChange={(event) => updateField("nombre", event.target.value)}
                />
                {errors.nombre ? (
                  <p className="field-error-react">{errors.nombre}</p>
                ) : null}
              </div>

              <div className="field-group-react">
                <label htmlFor="apellidos">Apellidos</label>
                <input
                  type="text"
                  id="apellidos"
                  name="apellidos"
                  placeholder="Ej. Pérez García"
                  maxLength={100}
                  value={form.apellidos}
                  onChange={(event) => updateField("apellidos", event.target.value)}
                />
                {errors.apellidos ? (
                  <p className="field-error-react">{errors.apellidos}</p>
                ) : null}
              </div>
            </div>

            <div className="field-group-react">
              <label htmlFor="estudios">Estudios / Procedencia</label>
              <input
                type="text"
                id="estudios"
                name="estudios"
                placeholder="Ej. ETSIT UPM / Empresa X"
                maxLength={120}
                value={form.estudios}
                onChange={(event) => updateField("estudios", event.target.value)}
              />
              {errors.estudios ? (
                <p className="field-error-react">{errors.estudios}</p>
              ) : null}
            </div>

            <div className="field-group-react">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="tu@email.com"
                maxLength={120}
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
              {errors.email ? (
                <p className="field-error-react">{errors.email}</p>
              ) : null}
            </div>

            <label className="checkbox-row-react">
              <input
                type="checkbox"
                name="privacidad"
                checked={form.privacidad}
                onChange={(event) => updateField("privacidad", event.target.checked)}
              />
              <span>
                Acepto la política de privacidad y el tratamiento de mis datos
                para la gestión del evento.
              </span>
            </label>
            {errors.privacidad ? (
              <p className="field-error-react">{errors.privacidad}</p>
            ) : null}

            <button type="submit" className="submit-btn-react" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Confirmar registro"}
              <span aria-hidden="true">→</span>
            </button>

            <p className="privacy-text-react">
              Al registrarte, podremos enviarte información sobre este evento y
              futuras iniciativas de TelecoEmprende.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
