import { motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Pencil, Trash2, UserPlus } from "lucide-react";

import { deleteRegistration, updateRegistrationEstado } from "../../api/admin";
import { useEntradaDeFila } from "../movimiento";
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
import { RegistroDialog, type EditData } from "./RegistroDialog";

const ESTADO_BADGE_LABELS: Record<Estado, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  waitlist: "Waitlist",
};
const ESTADO_BADGE_CLASS: Record<Estado, string> = {
  pendiente: "bg-[var(--color-paper-line)] text-[var(--color-slate)]",
  aceptado: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  rechazado: "bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
  waitlist: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
};
// El backend ya valida el esquema al crear/editar, pero esto es defensa en
// profundidad: nunca renderizar como enlace clicable un valor que no venga
// de antemano garantizado como https://drive.google.com/... (por ejemplo,
// filas antiguas insertadas antes de que existiera esa validación).
const DRIVE_LINK_PATTERN = /^https:\/\/(www\.)?drive\.google\.com\//i;

const TH = "border-b border-[var(--color-divider)] bg-[var(--color-paper)] px-3 py-2.5 text-left text-xs font-bold text-[var(--color-slate)]";
const TD = "border-b border-[var(--color-divider)] px-3 py-2.5 text-left align-top text-sm text-foreground";
/** Segunda línea de una celda doble (email bajo el nombre, grado bajo la escuela). */
const SUB = "block text-xs text-muted-foreground";
const ACCION = "h-7 px-2.5 text-xs";

type RecordsTableProps = {
  registros: Registro[];
  onUpdate: (id: number, data: EditData) => void;
  onDelete: (id: number) => void;
  onEstadoChange: (id: number, estado: Estado) => void;
};

function EstadoBadge({ registro }: { registro: Registro }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-[5px] text-[0.8rem] font-bold whitespace-nowrap ${ESTADO_BADGE_CLASS[registro.estado]}`}
    >
      {ESTADO_BADGE_LABELS[registro.estado]}
      {registro.estado !== "pendiente" && registro.notificado ? (
        <Check size={13} strokeWidth={2.5} className="ml-1" aria-label="notificado" />
      ) : null}
    </span>
  );
}

export function RecordsTable({ registros, onUpdate, onDelete, onEstadoChange }: RecordsTableProps) {
  // `false`: son <tr>, ahí solo se atenúa la opacidad (ver `useEntradaDeFila`).
  const entradaFila = useEntradaDeFila(false);
  const [editando, setEditando] = useState<Registro | null>(null);
  const [changingEstadoId, setChangingEstadoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function changeEstado(id: number, estado: Estado) {
    setChangingEstadoId(id);
    setError(null);
    try {
      const res = await updateRegistrationEstado(id, estado);
      if (res.ok) {
        onEstadoChange(id, estado);
      }
    } catch (e) {
      setError((e as ApiFailure).message || "Error al cambiar el estado.");
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
      setError((e as ApiFailure).message || "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-[22px] border border-[var(--color-paper-line)] bg-white max-[720px]:-mx-[18px] max-[720px]:rounded-none max-[720px]:border-x-0 max-[420px]:-mx-4">
      {error && (
        <div className="border-b border-[color-mix(in_srgb,var(--color-error-text)_28%,white)] bg-[var(--color-error-bg)] px-4 py-2.5 text-sm font-bold text-[var(--color-error-text)]">
          {error}
        </div>
      )}

      <RegistroDialog
        registro={editando}
        onClose={() => setEditando(null)}
        onGuardado={onUpdate}
      />

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

      {/* Columnas emparejadas (persona + email, escuela + grado) para que la
          tabla quepa sin desplazarse en un portátil. La privacidad no tiene
          columna: era obligatoria para inscribirse, así que siempre es "Sí". */}
      <table className="w-full min-w-[920px] border-collapse">
        <thead>
          <tr>
            <th className={TH}>Persona</th>
            <th className={TH}>Estudios</th>
            <th className={TH}>Teléfono</th>
            <th className={TH}>Departamento</th>
            <th className={TH}>CV</th>
            <th className={TH}>Fecha</th>
            <th className={TH}>Estado</th>
            <th className={TH}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((registro, indice) => (
            <motion.tr
              key={registro.id}
              className="hover:bg-[var(--color-paper)]"
              {...entradaFila(indice)}
            >
              <td className={TD}>
                <span className="font-semibold">
                  {registro.nombre} {registro.apellidos}
                </span>
                <span className={SUB}>{registro.email}</span>
              </td>
              <td className={TD}>
                {[registro.escuela, registro.nivel].filter(Boolean).join(" · ") || "—"}
                <span className={SUB}>{registro.estudios}</span>
              </td>
              <td className={`${TD} whitespace-nowrap tabular-nums`}>{registro.telefono || "—"}</td>
              <td className={TD}>{registro.departamento || "—"}</td>
              <td className={TD}>
                {registro.drive_link && DRIVE_LINK_PATTERN.test(registro.drive_link) ? (
                  <a href={registro.drive_link} target="_blank" rel="noreferrer">
                    Ver
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className={`${TD} whitespace-nowrap tabular-nums`} title={registro.fecha}>
                {registro.fecha.slice(0, 10)}
              </td>
              <td className={TD}>
                <EstadoBadge registro={registro} />
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <span className="mr-1.5 inline-flex gap-1">
                  <Button
                    size="sm"
                    className={`${ACCION} bg-[var(--color-success-text)] text-white hover:bg-[var(--color-success-text)]/90`}
                    title="Aceptar"
                    disabled={changingEstadoId === registro.id || registro.estado === "aceptado"}
                    onClick={() => void changeEstado(registro.id, "aceptado")}
                  >
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    className={`${ACCION} bg-[var(--color-error-text)] text-white hover:bg-[var(--color-error-text)]/90`}
                    title="Rechazar"
                    disabled={changingEstadoId === registro.id || registro.estado === "rechazado"}
                    onClick={() => void changeEstado(registro.id, "rechazado")}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className={`${ACCION} bg-[var(--color-gold)] text-[var(--color-navy)] hover:bg-[var(--color-gold)]/90`}
                    title="Waitlist"
                    disabled={changingEstadoId === registro.id || registro.estado === "waitlist"}
                    onClick={() => void changeEstado(registro.id, "waitlist")}
                  >
                    Waitlist
                  </Button>
                </span>
                {registro.estado === "aceptado" ? (
                  <Button asChild variant="ghost" size="icon" className="text-[var(--color-impulso)]">
                    <Link
                      to={`/equipo?seccion=cuentas&nombre=${encodeURIComponent(
                        registro.nombre,
                      )}&apellidos=${encodeURIComponent(registro.apellidos)}&email=${encodeURIComponent(
                        registro.email,
                      )}`}
                      title="Crear acceso de equipo"
                    >
                      <UserPlus size={15} strokeWidth={1.75} />
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[var(--color-orange)]"
                  title="Editar"
                  onClick={() => setEditando(registro)}
                >
                  <Pencil size={15} strokeWidth={1.75} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[var(--color-error-text)]"
                  title="Eliminar"
                  onClick={() => setConfirmDeleteId(registro.id)}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </Button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
