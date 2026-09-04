import { useState } from "react";
import { updateRegistration, deleteRegistration, updateRegistrationEstado } from "../../api/admin";
import { UPM_SCHOOLS } from "../../data/upmSchools";
import type { Estado, Registro } from "../../types/admin";
import type { ApiFailure } from "../../types/api";

const DEPARTAMENTOS = ["Tech/Ingeniería", "Marketing/Comms", "Eventos/Logística"];
const NIVELES = ["Grado", "Máster"];
const ESTADO_BADGE_LABELS: Record<Estado, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  waitlist: "Waitlist",
};
// El backend ya valida el esquema al crear/editar, pero esto es defensa en
// profundidad: nunca renderizar como enlace clicable un valor que no venga
// de antemano garantizado como https://drive.google.com/... (por ejemplo,
// filas antiguas insertadas antes de que existiera esa validación).
const DRIVE_LINK_PATTERN = /^https:\/\/(www\.)?drive\.google\.com\//i;

type RecordsTableProps = {
  registros: Registro[];
  onUpdate: (
    id: number,
    data: {
      nombre: string;
      apellidos: string;
      escuela: string;
      nivel: string;
      estudios: string;
      email: string;
      telefono: string;
      departamento: string;
      drive_link: string;
    },
  ) => void;
  onDelete: (id: number) => void;
  onEstadoChange: (id: number, estado: Estado) => void;
};

export function RecordsTable({ registros, onUpdate, onDelete, onEstadoChange }: RecordsTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [changingEstadoId, setChangingEstadoId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    nombre: "",
    apellidos: "",
    escuela: "",
    nivel: "",
    estudios: "",
    email: "",
    telefono: "",
    departamento: "",
    drive_link: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  function startEdit(r: Registro) {
    setEditingId(r.id);
    setEditData({
      nombre: r.nombre,
      apellidos: r.apellidos,
      escuela: r.escuela,
      nivel: r.nivel,
      estudios: r.estudios,
      email: r.email,
      telefono: r.telefono,
      departamento: r.departamento,
      drive_link: r.drive_link,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit() {
    if (editingId === null) return;
    if (
      !editData.nombre ||
      !editData.apellidos ||
      !editData.estudios ||
      !editData.email ||
      !editData.telefono ||
      !editData.departamento ||
      !editData.drive_link
    ) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await updateRegistration(editingId, editData);
      if (res.ok) {
        onUpdate(editingId, editData);
        setEditingId(null);
      }
    } catch (e) {
      const apiErr = e as ApiFailure;
      setError(apiErr.message || "Error al actualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function changeEstado(id: number, estado: Estado) {
    setChangingEstadoId(id);
    setError(null);
    try {
      const res = await updateRegistrationEstado(id, estado);
      if (res.ok) {
        onEstadoChange(id, estado);
      }
    } catch (e) {
      const apiErr = e as ApiFailure;
      setError(apiErr.message || "Error al cambiar el estado.");
    } finally {
      setChangingEstadoId(null);
    }
  }

  async function confirmDelete() {
    if (confirmDeleteId === null) return;
    setDeleting(true);
    try {
      const res = await deleteRegistration(confirmDeleteId);
      if (res.ok) {
        onDelete(confirmDeleteId);
        setConfirmDeleteId(null);
      }
    } catch (e) {
      const apiErr = e as ApiFailure;
      setError(apiErr.message || "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="table-wrapper-react">
      {error && <div className="table-error-banner">{error}</div>}

      {confirmDeleteId !== null && (
        <div className="table-confirm-overlay">
          <div className="table-confirm-box">
            <p>¿Seguro que quieres eliminar este registro?</p>
            <div className="table-confirm-actions">
              <button className="btn-confirm-delete" disabled={deleting} onClick={confirmDelete}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
              <button className="btn-confirm-cancel" disabled={deleting} onClick={() => setConfirmDeleteId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="records-table-react">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Apellidos</th>
            <th>Escuela</th>
            <th>Nivel</th>
            <th>Grado / Máster</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Departamento</th>
            <th>CV y pitch</th>
            <th>Privacidad</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((registro) => (
            <tr key={registro.id}>
              {editingId === registro.id ? (
                <>
                  <td>
                    <input
                      className="inline-edit-input"
                      value={editData.nombre}
                      onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="inline-edit-input"
                      value={editData.apellidos}
                      onChange={(e) => setEditData({ ...editData, apellidos: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="inline-edit-input"
                      value={editData.escuela}
                      onChange={(e) => setEditData({ ...editData, escuela: e.target.value })}
                    >
                      <option value="">—</option>
                      {UPM_SCHOOLS.map((school) => (
                        <option value={school.name} key={school.code}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="inline-edit-input"
                      value={editData.nivel}
                      onChange={(e) => setEditData({ ...editData, nivel: e.target.value })}
                    >
                      <option value="">—</option>
                      {NIVELES.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="inline-edit-input"
                      value={editData.estudios}
                      onChange={(e) => setEditData({ ...editData, estudios: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="inline-edit-input"
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="inline-edit-input"
                      type="tel"
                      value={editData.telefono}
                      onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="inline-edit-input"
                      value={editData.departamento}
                      onChange={(e) => setEditData({ ...editData, departamento: e.target.value })}
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
                  </td>
                  <td>
                    <input
                      className="inline-edit-input"
                      type="url"
                      value={editData.drive_link}
                      onChange={(e) => setEditData({ ...editData, drive_link: e.target.value })}
                    />
                  </td>
                  <td>{registro.privacidad}</td>
                  <td>{registro.fecha}</td>
                  <td>
                    <span className={`estado-badge estado-badge-${registro.estado}`}>
                      {ESTADO_BADGE_LABELS[registro.estado]}
                      {registro.estado !== "pendiente" && registro.notificado ? " ✓" : ""}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-icon btn-save" title="Guardar" disabled={saving} onClick={saveEdit}>
                      {saving ? "…" : "✓"}
                    </button>
                    <button className="btn-icon btn-cancel" title="Cancelar" disabled={saving} onClick={cancelEdit}>
                      ✕
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td>{registro.nombre}</td>
                  <td>{registro.apellidos}</td>
                  <td>{registro.escuela || "—"}</td>
                  <td>{registro.nivel || "—"}</td>
                  <td>{registro.estudios}</td>
                  <td>{registro.email}</td>
                  <td>{registro.telefono || "—"}</td>
                  <td>{registro.departamento || "—"}</td>
                  <td>
                    {registro.drive_link && DRIVE_LINK_PATTERN.test(registro.drive_link) ? (
                      <a href={registro.drive_link} target="_blank" rel="noreferrer">
                        Ver enlace
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{registro.privacidad}</td>
                  <td>{registro.fecha}</td>
                  <td>
                    <span className={`estado-badge estado-badge-${registro.estado}`}>
                      {ESTADO_BADGE_LABELS[registro.estado]}
                      {registro.estado !== "pendiente" && registro.notificado ? " ✓" : ""}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="estado-actions-react">
                      <button
                        className="btn-estado btn-estado-aceptar"
                        title="Aceptar"
                        disabled={changingEstadoId === registro.id || registro.estado === "aceptado"}
                        onClick={() => void changeEstado(registro.id, "aceptado")}
                      >
                        Aceptar
                      </button>
                      <button
                        className="btn-estado btn-estado-rechazar"
                        title="Rechazar"
                        disabled={changingEstadoId === registro.id || registro.estado === "rechazado"}
                        onClick={() => void changeEstado(registro.id, "rechazado")}
                      >
                        Rechazar
                      </button>
                      <button
                        className="btn-estado btn-estado-waitlist"
                        title="Waitlist"
                        disabled={changingEstadoId === registro.id || registro.estado === "waitlist"}
                        onClick={() => void changeEstado(registro.id, "waitlist")}
                      >
                        Waitlist
                      </button>
                    </div>
                    <button className="btn-icon btn-edit" title="Editar" onClick={() => startEdit(registro)}>
                      ✎
                    </button>
                    <button className="btn-icon btn-delete" title="Eliminar" onClick={() => setConfirmDeleteId(registro.id)}>
                      🗑
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
