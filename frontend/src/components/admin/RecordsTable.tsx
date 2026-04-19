import { useState } from "react";
import { updateRegistration, deleteRegistration } from "../../api/admin";
import type { Registro } from "../../types/admin";
import type { ApiFailure } from "../../types/api";

type RecordsTableProps = {
  registros: Registro[];
  onUpdate: (id: number, data: { nombre: string; apellidos: string; estudios: string; email: string }) => void;
  onDelete: (id: number) => void;
};

export function RecordsTable({ registros, onUpdate, onDelete }: RecordsTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ nombre: "", apellidos: "", estudios: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  function startEdit(r: Registro) {
    setEditingId(r.id);
    setEditData({ nombre: r.nombre, apellidos: r.apellidos, estudios: r.estudios, email: r.email });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit() {
    if (editingId === null) return;
    if (!editData.nombre || !editData.apellidos || !editData.estudios || !editData.email) {
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
            <th>Estudios / Procedencia</th>
            <th>Email</th>
            <th>Privacidad</th>
            <th>Fecha</th>
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
                  <td>{registro.privacidad}</td>
                  <td>{registro.fecha}</td>
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
                  <td>{registro.estudios}</td>
                  <td>{registro.email}</td>
                  <td>{registro.privacidad}</td>
                  <td>{registro.fecha}</td>
                  <td className="actions-cell">
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
