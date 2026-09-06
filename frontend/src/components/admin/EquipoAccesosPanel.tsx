import { FormEvent, useEffect, useState } from "react";

import {
  createEquipoAcceso,
  deleteEquipoAcceso,
  getEquipoAccesos,
  updateEquipoAcceso,
} from "../../api/admin";
import { AlertBanner } from "../feedback/AlertBanner";
import type { ApiFailure } from "../../types/api";
import type { EquipoAcceso, Team } from "../../types/equipo";

const EQUIPOS: { value: Team; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "eventos", label: "Eventos" },
  { value: "ingenieria", label: "Ingeniería (acceso admin)" },
];

function EquiposCheckboxes({
  selected,
  onChange,
  idPrefix,
}: {
  selected: Team[];
  onChange: (equipos: Team[]) => void;
  idPrefix: string;
}) {
  function toggle(team: Team) {
    onChange(
      selected.includes(team) ? selected.filter((e) => e !== team) : [...selected, team],
    );
  }

  return (
    <div className="equipo-accesos-checkboxes-react">
      {EQUIPOS.map((equipo) => (
        <label key={equipo.value} htmlFor={`${idPrefix}-${equipo.value}`}>
          <input
            type="checkbox"
            id={`${idPrefix}-${equipo.value}`}
            checked={selected.includes(equipo.value)}
            onChange={() => toggle(equipo.value)}
          />
          {equipo.label}
        </label>
      ))}
    </div>
  );
}

export function EquipoAccesosPanel() {
  const [accesos, setAccesos] = useState<EquipoAcceso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");

  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [nuevosEquipos, setNuevosEquipos] = useState<Team[]>([]);

  async function cargar() {
    setIsLoading(true);
    try {
      const response = await getEquipoAccesos();
      if (response.ok) {
        setAccesos(response.accesos);
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudieron cargar los accesos de equipo.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function handleCrear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await createEquipoAcceso(nuevoEmail, nuevaPassword, nuevosEquipos);
      if (response.ok) {
        setMessageVariant("success");
        setMessage("Acceso creado.");
        setNuevoEmail("");
        setNuevaPassword("");
        setNuevosEquipos([]);
        await cargar();
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo crear el acceso.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEquiposChange(acceso: EquipoAcceso, equipos: Team[]) {
    try {
      const response = await updateEquipoAcceso(acceso.id, { equipos });
      if (response.ok) {
        setAccesos((prev) => prev.map((a) => (a.id === acceso.id ? { ...a, equipos } : a)));
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo actualizar el acceso.");
    }
  }

  async function handleToggleActivo(acceso: EquipoAcceso) {
    try {
      const response = await updateEquipoAcceso(acceso.id, { activo: !acceso.activo });
      if (response.ok) {
        setAccesos((prev) =>
          prev.map((a) => (a.id === acceso.id ? { ...a, activo: !a.activo } : a)),
        );
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo actualizar el acceso.");
    }
  }

  async function handleEliminar(acceso: EquipoAcceso) {
    try {
      const response = await deleteEquipoAcceso(acceso.id);
      if (response.ok) {
        setAccesos((prev) => prev.filter((a) => a.id !== acceso.id));
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo eliminar el acceso.");
    }
  }

  return (
    <section className="admin-card-react equipo-accesos-panel-react">
      <h2>Accesos de equipo (/equipo)</h2>
      <p>
        Quien tenga el equipo <strong>Ingeniería</strong> también recibe acceso a este panel
        de administración al iniciar sesión en /equipo.
      </p>

      {message ? <AlertBanner variant={messageVariant} message={message} /> : null}

      {isLoading ? (
        <p>Cargando accesos...</p>
      ) : (
        <table className="equipo-accesos-table-react">
          <thead>
            <tr>
              <th>Email</th>
              <th>Equipos</th>
              <th>Activo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accesos.map((acceso) => (
              <tr key={acceso.id}>
                <td>{acceso.email}</td>
                <td>
                  <EquiposCheckboxes
                    idPrefix={`acceso-${acceso.id}`}
                    selected={acceso.equipos}
                    onChange={(equipos) => void handleEquiposChange(acceso, equipos)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary-btn-react"
                    onClick={() => void handleToggleActivo(acceso)}
                  >
                    {acceso.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary-btn-react"
                    onClick={() => void handleEliminar(acceso)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {accesos.length === 0 ? (
              <tr>
                <td colSpan={4}>Todavía no hay accesos de equipo dados de alta.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      <form className="equipo-accesos-form-react" onSubmit={handleCrear}>
        <h3>Añadir nueva persona</h3>
        <div className="field-group-react">
          <label htmlFor="nuevo-equipo-email">Email</label>
          <input
            type="email"
            id="nuevo-equipo-email"
            value={nuevoEmail}
            onChange={(event) => setNuevoEmail(event.target.value)}
            required
          />
        </div>
        <div className="field-group-react">
          <label htmlFor="nuevo-equipo-password">Contraseña</label>
          <input
            type="password"
            id="nuevo-equipo-password"
            value={nuevaPassword}
            onChange={(event) => setNuevaPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <EquiposCheckboxes
          idPrefix="nuevo-equipo"
          selected={nuevosEquipos}
          onChange={setNuevosEquipos}
        />
        <button
          type="submit"
          className="submit-btn-react"
          disabled={isSaving || nuevosEquipos.length === 0}
        >
          {isSaving ? "Creando..." : "Crear acceso"}
        </button>
      </form>
    </section>
  );
}
