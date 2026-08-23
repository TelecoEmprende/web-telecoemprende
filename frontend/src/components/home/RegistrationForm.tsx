import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { submitRegistration } from "../../api/public";
import { AlertBanner } from "../feedback/AlertBanner";
import { UPM_SCHOOLS } from "../../data/upmSchools";
import type { ApiFailure } from "../../types/api";
import type { RegistrationErrors, RegistrationPayload } from "../../types/registration";
import { validateRegistrationDraft } from "../../utils/validation";

type Nivel = "grado" | "master";

const DEPARTAMENTOS = ["Tech/Ingeniería", "Marketing/Comms", "Eventos/Logística"];

const INITIAL_FORM = (evento: string): RegistrationPayload => ({
  nombre: "",
  apellidos: "",
  escuela: "",
  nivel: "Grado",
  estudios: "",
  email: "",
  departamento: "",
  drive_link: "",
  privacidad: false,
  evento,
  telefono_oculto: "",
});

function buildEstudios(nivel: Nivel, programa: string): string {
  if (!programa) {
    return "";
  }
  return nivel === "grado" ? `Grado - ${programa}` : programa;
}

export function RegistrationForm({ evento, title }: { evento: string; title?: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationPayload>(() => INITIAL_FORM(evento));
  const [escuela, setEscuela] = useState("");
  const [nivel, setNivel] = useState<Nivel>("grado");
  const [programa, setPrograma] = useState("");
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const school = UPM_SCHOOLS.find((item) => item.code === escuela);
  const programas = school ? (nivel === "grado" ? school.grados : school.masters) : [];

  function updateField<K extends keyof RegistrationPayload>(
    field: K,
    value: RegistrationPayload[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function selectEscuela(value: string) {
    setEscuela(value);
    setPrograma("");
    const selectedSchool = UPM_SCHOOLS.find((item) => item.code === value);
    updateField("escuela", selectedSchool?.name ?? "");
    updateField("estudios", "");
  }

  function selectNivel(nextNivel: Nivel) {
    if (nextNivel === nivel) {
      return;
    }
    setNivel(nextNivel);
    setPrograma("");
    updateField("nivel", nextNivel === "grado" ? "Grado" : "Máster");
    updateField("estudios", "");
  }

  function selectPrograma(value: string) {
    setPrograma(value);
    updateField("estudios", buildEstudios(nivel, value));
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
        setForm(INITIAL_FORM(evento));
        setEscuela("");
        setPrograma("");
        setNivel("grado");
        setErrors({});
        navigate("/gracias", {
          state: {
            attendeeName: form.nombre.trim(),
            attendeeEmail: form.email.trim(),
            evento,
          },
        });
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessage(apiError.message || "No se pudo enviar tu solicitud.");
      if (apiError.errors) {
        setErrors((current) => ({ ...current, ...apiError.errors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="form-section-react" id="inscripcion">
      {/* Ancla legacy: EventoSantiPabloPage y el Header antiguo enlazan a #registro */}
      <span id="registro" aria-hidden="true" />
      <div className="container-react form-layout-react">
        <div className="section-copy-card-react">
          <span className="section-eyebrow-react">Solicitud</span>
          <h2>{title ?? "Envía tu solicitud de inscripción"}</h2>
          <p className="section-copy">
            Rellena tus datos, adjunta tu CV y tu vídeo de presentación, y
            listo. Te escribiremos con la resolución, los primeros eventos del
            curso y el acceso al grupo. Usaremos tus datos únicamente para
            gestionar tu solicitud y las comunicaciones del club.
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
              <label htmlFor="email">Correo electrónico institucional (UPM)</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="nombre.apellido@alumnos.upm.es"
                maxLength={120}
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
              <p className="field-hint-react">Debe terminar en @alumnos.upm.es o @upm.es.</p>
              {errors.email ? (
                <p className="field-error-react">{errors.email}</p>
              ) : null}
            </div>

            <div className="field-group-react">
              <label htmlFor="escuela">Escuela</label>
              <select
                id="escuela"
                name="escuela"
                value={escuela}
                onChange={(event) => selectEscuela(event.target.value)}
              >
                <option value="" disabled>
                  Elige tu escuela
                </option>
                {UPM_SCHOOLS.map((item) => (
                  <option value={item.code} key={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="field-hint-react">
                Hemos abierto las inscripciones a toda la UPM: elige la escuela en la que estudias.
              </p>
            </div>

            <div className="field-group-react">
              <span className="field-label-react" id="nivel-label">
                Grado o Máster
              </span>
              <div
                className="level-toggle-react"
                role="group"
                aria-labelledby="nivel-label"
              >
                <button
                  type="button"
                  className={nivel === "grado" ? "active" : undefined}
                  aria-pressed={nivel === "grado"}
                  onClick={() => selectNivel("grado")}
                >
                  Grado
                </button>
                <button
                  type="button"
                  className={nivel === "master" ? "active" : undefined}
                  aria-pressed={nivel === "master"}
                  onClick={() => selectNivel("master")}
                >
                  Máster
                </button>
              </div>
            </div>

            <div className="field-group-react">
              <label htmlFor="programa">Programa</label>
              <select
                id="programa"
                name="programa"
                value={programa}
                disabled={!escuela}
                onChange={(event) => selectPrograma(event.target.value)}
              >
                <option value="" disabled>
                  {!escuela
                    ? "Elige primero tu escuela"
                    : nivel === "grado"
                      ? "Elige tu grado"
                      : "Elige tu máster"}
                </option>
                {programas.map((option) => (
                  <option value={option.name} key={option.code}>
                    {option.code} · {option.name}
                  </option>
                ))}
              </select>
              {errors.estudios ? (
                <p className="field-error-react">{errors.estudios}</p>
              ) : null}
            </div>

            <div className="field-group-react">
              <label htmlFor="departamento">¿A qué departamento te gustaría unirte?</label>
              <select
                id="departamento"
                name="departamento"
                value={form.departamento}
                onChange={(event) => updateField("departamento", event.target.value)}
              >
                <option value="" disabled>
                  Elige un departamento
                </option>
                {DEPARTAMENTOS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="field-hint-react">
                Es tu preferencia, no una asignación: si te seleccionamos, no
                podemos garantizar que acabes en este departamento.
              </p>
              {errors.departamento ? (
                <p className="field-error-react">{errors.departamento}</p>
              ) : null}
            </div>

            <div className="field-group-react">
              <label htmlFor="drive_link">Enlace a tu CV y vídeo (Google Drive)</label>
              <input
                type="url"
                id="drive_link"
                name="drive_link"
                placeholder="https://drive.google.com/..."
                maxLength={300}
                value={form.drive_link}
                onChange={(event) => updateField("drive_link", event.target.value)}
              />
              <p className="field-hint-react">
                Sube tu CV y tu vídeo a una carpeta de Google Drive, activa el
                acceso por enlace ("cualquier persona con el enlace") y pégalo aquí.
              </p>
              {errors.drive_link ? (
                <p className="field-error-react">{errors.drive_link}</p>
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
                para la gestión de la inscripción.
              </span>
            </label>
            {errors.privacidad ? (
              <p className="field-error-react">{errors.privacidad}</p>
            ) : null}

            <button type="submit" className="submit-btn-react" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar solicitud de inscripción"}
              <span aria-hidden="true">→</span>
            </button>

            <p className="privacy-text-react">
              Al enviar tu solicitud, podremos enviarte información sobre las
              actividades de TelecoEmprende durante el curso 2026/27.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
