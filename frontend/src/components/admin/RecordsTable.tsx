import { useState } from "react";
import { updateRegistration, deleteRegistration, updateRegistrationEstado } from "../../api/admin";
import { UPM_SCHOOLS } from "../../data/upmSchools";
import type { Estado, Registro } from "../../types/admin";
import type { ApiFailure } from "../../types/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const DEPARTAMENTOS = ["Tech/Ingeniería", "Marketing/Comms", "Eventos/Logística"];
const NIVELES = ["Grado", "Máster"];
const ESTADO_BADGE_LABELS: Record<Estado, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  waitlist: "Waitlist",
};
const ESTADO_BADGE_CLASS: Record<Estado, string> = {
  pendiente: "bg-[#eef1f5] text-slate-600",
  aceptado: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  rechazado: "bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
  waitlist: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
};
// Radix rechaza un SelectItem con value="", así que los huecos vacíos
// ("—", "sin elegir") viajan como este centinela y se traducen en los bordes.
const SIN_VALOR = "none";
// El backend ya valida el esquema al crear/editar, pero esto es defensa en
// profundidad: nunca renderizar como enlace clicable un valor que no venga
// de antemano garantizado como https://drive.google.com/... (por ejemplo,
// filas antiguas insertadas antes de que existiera esa validación).
const DRIVE_LINK_PATTERN = /^https:\/\/(www\.)?drive\.google\.com\//i;

const TH = "border-b border-[#eef2f7] bg-[#f8fbff] px-[18px] py-4 text-left text-sm font-extrabold text-[#344054] max-[720px]:px-3.5";
const TD = "border-b border-[#eef2f7] px-[18px] py-4 text-left align-top text-foreground max-[720px]:px-3.5";
const TD_ANCHA = `${TD} min-w-[220px]`;
const INPUT = "w-full min-w-[100px]";

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

function EstadoBadge({ registro }: { registro: Registro }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-[5px] text-[0.8rem] font-extrabold whitespace-nowrap ${ESTADO_BADGE_CLASS[registro.estado]}`}
    >
      {ESTADO_BADGE_LABELS[registro.estado]}
      {registro.estado !== "pendiente" && registro.notificado ? " ✓" : ""}
    </span>
  );
}

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
    <div className="overflow-x-auto rounded-[22px] border border-[#dde5f1] bg-white max-[720px]:-mx-[18px] max-[720px]:rounded-none max-[720px]:border-x-0 max-[420px]:-mx-4">
      {error && (
        <div className="border-b border-[#f0d5d8] bg-[var(--color-error-bg)] px-4 py-2.5 text-sm font-bold text-[var(--color-error-text)]">
          {error}
        </div>
      )}

      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres eliminar este registro?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <table className="w-full min-w-[1080px] border-collapse">
        <thead>
          <tr>
            <th className={TH}>Nombre</th>
            <th className={TH}>Apellidos</th>
            <th className={TH}>Escuela</th>
            <th className={TH}>Nivel</th>
            <th className={TH}>Grado / Máster</th>
            <th className={TH}>Email</th>
            <th className={TH}>Teléfono</th>
            <th className={TH}>Departamento</th>
            <th className={TH}>CV y pitch</th>
            <th className={TH}>Privacidad</th>
            <th className={TH}>Fecha</th>
            <th className={TH}>Estado</th>
            <th className={TH}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((registro) => (
            <tr key={registro.id} className="hover:bg-[#fbfdff]">
              {editingId === registro.id ? (
                <>
                  <td className={TD}>
                    <Input
                      className={INPUT}
                      value={editData.nombre}
                      onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                    />
                  </td>
                  <td className={TD}>
                    <Input
                      className={INPUT}
                      value={editData.apellidos}
                      onChange={(e) => setEditData({ ...editData, apellidos: e.target.value })}
                    />
                  </td>
                  <td className={TD_ANCHA}>
                    <Select
                      value={editData.escuela || SIN_VALOR}
                      onValueChange={(value) =>
                        setEditData({ ...editData, escuela: value === SIN_VALOR ? "" : value })
                      }
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_VALOR}>—</SelectItem>
                        {UPM_SCHOOLS.map((school) => (
                          <SelectItem value={school.name} key={school.code}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={TD}>
                    <Select
                      value={editData.nivel || SIN_VALOR}
                      onValueChange={(value) =>
                        setEditData({ ...editData, nivel: value === SIN_VALOR ? "" : value })
                      }
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_VALOR}>—</SelectItem>
                        {NIVELES.map((option) => (
                          <SelectItem value={option} key={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={TD_ANCHA}>
                    <Input
                      className={INPUT}
                      value={editData.estudios}
                      onChange={(e) => setEditData({ ...editData, estudios: e.target.value })}
                    />
                  </td>
                  <td className={TD_ANCHA}>
                    <Input
                      className={INPUT}
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </td>
                  <td className={TD}>
                    <Input
                      className={INPUT}
                      type="tel"
                      value={editData.telefono}
                      onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                    />
                  </td>
                  <td className={TD}>
                    <Select
                      value={editData.departamento || undefined}
                      onValueChange={(value) => setEditData({ ...editData, departamento: value })}
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="Elige un departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTAMENTOS.map((option) => (
                          <SelectItem value={option} key={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={TD}>
                    <Input
                      className={INPUT}
                      type="url"
                      value={editData.drive_link}
                      onChange={(e) => setEditData({ ...editData, drive_link: e.target.value })}
                    />
                  </td>
                  <td className={TD}>{registro.privacidad}</td>
                  <td className={TD}>{registro.fecha}</td>
                  <td className={TD}>
                    <EstadoBadge registro={registro} />
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[var(--color-success-text)]"
                      title="Guardar"
                      disabled={saving}
                      onClick={() => void saveEdit()}
                    >
                      {saving ? "…" : "✓"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#7f8c8d]"
                      title="Cancelar"
                      disabled={saving}
                      onClick={cancelEdit}
                    >
                      ✕
                    </Button>
                  </td>
                </>
              ) : (
                <>
                  <td className={TD}>{registro.nombre}</td>
                  <td className={TD}>{registro.apellidos}</td>
                  <td className={TD_ANCHA}>{registro.escuela || "—"}</td>
                  <td className={TD}>{registro.nivel || "—"}</td>
                  <td className={TD_ANCHA}>{registro.estudios}</td>
                  <td className={TD_ANCHA}>{registro.email}</td>
                  <td className={TD}>{registro.telefono || "—"}</td>
                  <td className={TD}>{registro.departamento || "—"}</td>
                  <td className={TD}>
                    {registro.drive_link && DRIVE_LINK_PATTERN.test(registro.drive_link) ? (
                      <a href={registro.drive_link} target="_blank" rel="noreferrer">
                        Ver enlace
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={TD}>{registro.privacidad}</td>
                  <td className={TD}>{registro.fecha}</td>
                  <td className={TD}>
                    <EstadoBadge registro={registro} />
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <span className="mr-2.5 inline-flex gap-1.5">
                      <Button
                        size="sm"
                        className="bg-[var(--color-success-text)] text-white hover:bg-[var(--color-success-text)]/90"
                        title="Aceptar"
                        disabled={changingEstadoId === registro.id || registro.estado === "aceptado"}
                        onClick={() => void changeEstado(registro.id, "aceptado")}
                      >
                        Aceptar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[var(--color-error-text)] text-white hover:bg-[var(--color-error-text)]/90"
                        title="Rechazar"
                        disabled={changingEstadoId === registro.id || registro.estado === "rechazado"}
                        onClick={() => void changeEstado(registro.id, "rechazado")}
                      >
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#e6a417] text-white hover:bg-[#e6a417]/90"
                        title="Waitlist"
                        disabled={changingEstadoId === registro.id || registro.estado === "waitlist"}
                        onClick={() => void changeEstado(registro.id, "waitlist")}
                      >
                        Waitlist
                      </Button>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#e67e22]"
                      title="Editar"
                      onClick={() => startEdit(registro)}
                    >
                      ✎
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[var(--color-error-text)]"
                      title="Eliminar"
                      onClick={() => setConfirmDeleteId(registro.id)}
                    >
                      🗑
                    </Button>
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
