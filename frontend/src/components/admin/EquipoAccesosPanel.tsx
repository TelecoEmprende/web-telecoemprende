import { Camera, Search, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  createEquipoAcceso,
  deleteEquipoAcceso,
  getEquipoAccesos,
  updateEquipoAcceso,
} from "../../api/admin";
import { AvatarResponsable } from "../equipo/marketing/Avatares";
import { AlertBanner } from "../feedback/AlertBanner";
import { useEntradaDeFila } from "../movimiento";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { aAvatarCuadrado } from "../../utils/imagen";
import { normalizar } from "../../utils/texto";
import type { ApiFailure } from "../../types/api";
import {
  CARGO_LABEL,
  DEPTO_LABEL,
  TEAMS,
  type Cargo,
  type EquipoAcceso,
  type Team,
} from "../../types/equipo";

const CARGOS: { value: Cargo; label: string }[] = [
  { value: "", label: "Ninguno" },
  ...(Object.entries(CARGO_LABEL) as [Cargo, string][]).map(([value, label]) => ({ value, label })),
];

/** Mismo mínimo que `MIN_EQUIPOS_POR_PERSONA` en `backend/config.py`. */
const MIN_EQUIPOS = 2;

/** Pone `team` como preferencia número `posicion` (0 = 1ª). Si ya estaba en
 *  otra posición, las dos se intercambian en vez de quedar repetidas. */
function conPreferencia(equipos: Team[], posicion: number, team: Team): Team[] {
  const siguiente = [...equipos];
  const previa = siguiente.indexOf(team);
  if (previa >= 0) siguiente[previa] = siguiente[posicion];
  siguiente[posicion] = team;
  return siguiente.filter(Boolean);
}

/**
 * 1ª y 2ª preferencia de departamento, obligatorias, y el que queda como
 * opcional. El orden importa: es el que usa el selector de responsables para
 * proponer a quién asignar una tarea (ver `SelectorMiembros`).
 */
function Preferencias({
  equipos,
  onChange,
  idPrefix,
}: {
  equipos: Team[];
  onChange: (equipos: Team[]) => void;
  idPrefix: string;
}) {
  const resto = TEAMS.filter((t) => !equipos.slice(0, MIN_EQUIPOS).includes(t));
  const tercero = equipos.length >= MIN_EQUIPOS && resto.length === 1 ? resto[0] : null;

  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1].map((posicion) => (
        <div key={posicion} className="flex items-center gap-2">
          <span className={`cuentas-ordinal-react${posicion === 0 ? " is-primera" : ""}`}>
            {posicion + 1}ª
          </span>
          <Select
            value={equipos[posicion] ?? ""}
            onValueChange={(team) => onChange(conPreferencia(equipos, posicion, team as Team))}
            disabled={posicion === 1 && !equipos[0]}
          >
            <SelectTrigger
              size="sm"
              id={`${idPrefix}-pref-${posicion}`}
              aria-label={`${posicion + 1}ª preferencia`}
              className="w-32"
            >
              <SelectValue placeholder="Elegir..." />
            </SelectTrigger>
            <SelectContent>
              {TEAMS.map((team) => (
                <SelectItem key={team} value={team}>
                  {DEPTO_LABEL[team]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {tercero ? (
        <div className="flex items-center gap-1.5 pl-8">
          <Checkbox
            id={`${idPrefix}-tercero`}
            checked={equipos.includes(tercero)}
            onCheckedChange={(marcado) =>
              onChange(
                marcado ? [...equipos.slice(0, MIN_EQUIPOS), tercero] : equipos.slice(0, MIN_EQUIPOS),
              )
            }
          />
          <Label htmlFor={`${idPrefix}-tercero`} className="text-xs font-normal text-muted-foreground">
            También {DEPTO_LABEL[tercero]}
          </Label>
        </div>
      ) : null}
    </div>
  );
}

function VpDeCheckboxes({
  equipos,
  selected,
  onChange,
  idPrefix,
}: {
  equipos: Team[];
  selected: Team[];
  onChange: (vpDe: Team[]) => void;
  idPrefix: string;
}) {
  if (equipos.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col gap-1.5">
      {equipos.map((team) => {
        const id = `${idPrefix}-vp-${team}`;
        return (
          <div key={team} className="flex items-center gap-1.5">
            <Checkbox
              id={id}
              checked={selected.includes(team)}
              onCheckedChange={() =>
                onChange(selected.includes(team) ? selected.filter((e) => e !== team) : [...selected, team])
              }
            />
            <Label htmlFor={id} className="text-sm font-normal">
              {DEPTO_LABEL[team]}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

function CargoSelect({
  value,
  onChange,
  id,
}: {
  value: Cargo;
  onChange: (cargo: Cargo) => void;
  id?: string;
}) {
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : (v as Cargo))}>
      <SelectTrigger size="sm" id={id} className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CARGOS.map((cargo) => (
          <SelectItem key={cargo.value || "none"} value={cargo.value || "none"}>
            {cargo.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** La foto de la persona; tocarla abre el selector de archivos. La imagen se
 *  reduce en el navegador a 256px (`aAvatarCuadrado`) antes de subirla. */
function FotoEditable({
  acceso,
  onFoto,
}: {
  acceso: EquipoAcceso;
  onFoto: (foto: string) => void;
}) {
  const id = `acceso-${acceso.id}-foto`;
  return (
    <div className="flex flex-col items-center gap-1">
      <label htmlFor={id} className="cuentas-foto-react" title="Cambiar foto">
        <AvatarResponsable email={acceso.email} nombre={acceso.nombre} foto={acceso.foto} className="size-12" />
        <span className="cuentas-foto-camara-react" aria-hidden="true">
          <Camera />
        </span>
        <span className="sr-only">Cambiar la foto de {acceso.nombre || acceso.email}</span>
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const archivo = event.target.files?.[0];
          event.target.value = "";
          if (archivo) void aAvatarCuadrado(archivo).then(onFoto);
        }}
      />
      {acceso.foto ? (
        <button type="button" className="cuentas-quitar-foto-react" onClick={() => onFoto("")}>
          Quitar
        </button>
      ) : null}
    </div>
  );
}

export function EquipoAccesosPanel() {
  const entradaFila = useEntradaDeFila(false);
  const [searchParams] = useSearchParams();
  const [accesos, setAccesos] = useState<EquipoAcceso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");
  // Preferencias a medio elegir (solo la 1ª): el backend exige dos, así que
  // no se guardan hasta que estén las dos.
  const [borradores, setBorradores] = useState<Record<number, Team[]>>({});
  // Borrar una cuenta no se deshace: se confirma antes.
  const [borrando, setBorrando] = useState<EquipoAcceso | null>(null);

  // Prellenado desde "Crear acceso de equipo →" en Inscripciones
  // (`RecordsTable.tsx`): una candidatura aceptada trae nombre y email.
  const [nuevoEmail, setNuevoEmail] = useState(searchParams.get("email") ?? "");
  const [nuevoNombre, setNuevoNombre] = useState(searchParams.get("nombre") ?? "");
  const [nuevosApellidos, setNuevosApellidos] = useState(searchParams.get("apellidos") ?? "");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [nuevosEquipos, setNuevosEquipos] = useState<Team[]>([]);
  const [nuevoVpDe, setNuevoVpDe] = useState<Team[]>([]);
  const [nuevoCargo, setNuevoCargo] = useState<Cargo>("");
  const [nuevoMentor, setNuevoMentor] = useState("");
  const [nuevoAdmin, setNuevoAdmin] = useState(false);

  // El prellenado puede apuntar a un email que ya tiene acceso: se avisa aquí
  // en vez de dejar que el backend responda con un error genérico.
  const accesoExistente = useMemo(
    () => accesos.find((a) => a.email.trim().toLowerCase() === nuevoEmail.trim().toLowerCase()),
    [accesos, nuevoEmail],
  );

  const [busqueda, setBusqueda] = useState("");

  // Pendientes (sin activar) arriba: son las que piden algo a quien mira. La
  // búsqueda mira nombre, apellidos (juntos, para "ana garcia") y email,
  // sin tildes ni mayúsculas.
  const ordenados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const filtrados = q
      ? accesos.filter((a) =>
          normalizar(`${a.nombre} ${a.apellidos} ${a.email}`).includes(q),
        )
      : accesos;
    return [...filtrados].sort((a, b) => Number(a.activo) - Number(b.activo));
  }, [accesos, busqueda]);

  function avisarError(error: unknown, porDefecto: string) {
    setMessageVariant("error");
    setMessage((error as ApiFailure).message || porDefecto);
  }

  async function cargar() {
    setIsLoading(true);
    try {
      const response = await getEquipoAccesos();
      if (response.ok) setAccesos(response.accesos);
    } catch (error) {
      avisarError(error, "No se pudieron cargar las cuentas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  /** Guarda unos campos de una cuenta y, si va bien, los aplica en la tabla. */
  async function guardar(acceso: EquipoAcceso, cambios: Partial<EquipoAcceso>) {
    try {
      const response = await updateEquipoAcceso(acceso.id, cambios);
      if (response.ok) {
        setAccesos((prev) => prev.map((a) => (a.id === acceso.id ? { ...a, ...cambios } : a)));
      }
    } catch (error) {
      avisarError(error, "No se pudo actualizar la cuenta.");
    }
  }

  function cambiarPreferencias(acceso: EquipoAcceso, equipos: Team[]) {
    if (equipos.length < MIN_EQUIPOS) {
      setBorradores((prev) => ({ ...prev, [acceso.id]: equipos }));
      return;
    }
    setBorradores(({ [acceso.id]: _, ...resto }) => resto);
    // Al quitar un departamento, el backend rechaza un VP que ya no esté en
    // `equipos`: se recorta aquí también.
    void guardar(acceso, { equipos, vp_de: acceso.vp_de.filter((v) => equipos.includes(v)) });
  }

  async function handleEliminar(acceso: EquipoAcceso) {
    setBorrando(null);
    try {
      const response = await deleteEquipoAcceso(acceso.id);
      if (response.ok) setAccesos((prev) => prev.filter((a) => a.id !== acceso.id));
    } catch (error) {
      avisarError(error, "No se pudo eliminar la cuenta.");
    }
  }

  async function handleCrear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await createEquipoAcceso({
        email: nuevoEmail,
        password: nuevaPassword,
        equipos: nuevosEquipos,
        vp_de: nuevoVpDe,
        cargo: nuevoCargo,
        nombre: nuevoNombre,
        apellidos: nuevosApellidos,
        mentor_email: nuevoMentor,
        es_admin: nuevoAdmin,
      });
      if (response.ok) {
        setMessageVariant("success");
        setMessage("Cuenta creada.");
        setNuevoEmail("");
        setNuevoNombre("");
        setNuevosApellidos("");
        setNuevaPassword("");
        setNuevosEquipos([]);
        setNuevoVpDe([]);
        setNuevoCargo("");
        setNuevoMentor("");
        setNuevoAdmin(false);
        await cargar();
      }
    } catch (error) {
      avisarError(error, "No se pudo crear la cuenta.");
    } finally {
      setIsSaving(false);
    }
  }

  // Igual que el backend: dos departamentos como mínimo, o ninguno con un
  // cargo (board sin departamento).
  const nuevoValido =
    nuevosEquipos.length >= MIN_EQUIPOS || (nuevosEquipos.length === 0 && nuevoCargo !== "");

  return (
    <section className="admin-card-react equipo-accesos-panel-react shadcn-scope">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* El título ya está en la barra superior. */}
          <p className="max-w-[72ch]">
            Cada persona va en dos departamentos como mínimo: la <strong>1ª preferencia</strong> es
            donde se le proponen antes las tareas. El cargo es un título; el acceso al grupo
            Admin se da aparte, con la casilla <strong>Admin</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="/api/admin/equipo/pdf">Descargar PDF</a>
          </Button>
          {/* Datos personales guardados, con departamentos, cargo y foto. */}
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="/api/admin/equipo/excel">Descargar Excel</a>
          </Button>
        </div>
      </div>

      {message ? <AlertBanner variant={messageVariant} message={message} /> : null}

      <div className="cuentas-buscador-react mt-4">
        <Search aria-hidden="true" />
        <Input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por nombre, apellidos o email"
          aria-label="Buscar cuentas"
        />
        {busqueda.trim() ? (
          <span className="cuentas-buscador-cuenta-react" aria-live="polite">
            {ordenados.length} de {accesos.length}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p>Cargando cuentas...</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="cuentas-tabla-react w-full min-[721px]:min-w-[1000px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="cuentas-fija-react px-2 font-medium">Persona</th>
                <th className="px-2 font-medium">Departamentos</th>
                <th className="px-2 font-medium">VP de</th>
                <th className="px-2 font-medium">Cargo</th>
                <th className="px-2 font-medium">Admin</th>
                <th className="px-2 font-medium">Mentor</th>
                <th className="px-2 font-medium">DNI y correo personal</th>
                <th className="px-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((acceso, indice) => {
                const equipos = borradores[acceso.id] ?? acceso.equipos;
                const faltaSegunda = acceso.equipos.length > 0 && acceso.equipos.length < MIN_EQUIPOS;
                return (
                  <motion.tr
                    key={acceso.id}
                    className={`rounded-lg bg-card align-top ring-1 ring-foreground/10${
                      acceso.activo ? "" : " cuentas-pendiente-react"
                    }`}
                    {...entradaFila(indice)}
                  >
                    <td className="cuentas-fija-react p-2" data-label="Persona">
                      <div className="flex items-start gap-3">
                        <FotoEditable acceso={acceso} onFoto={(foto) => void guardar(acceso, { foto })} />
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex gap-1.5">
                            <Input
                              defaultValue={acceso.nombre}
                              placeholder="Nombre"
                              aria-label={`Nombre de ${acceso.email}`}
                              className="h-8 w-24"
                              onBlur={(event) => {
                                const nombre = event.target.value.trim();
                                if (nombre !== acceso.nombre) void guardar(acceso, { nombre });
                              }}
                            />
                            <Input
                              defaultValue={acceso.apellidos}
                              placeholder="Apellidos"
                              aria-label={`Apellidos de ${acceso.email}`}
                              className="h-8 w-32"
                              onBlur={(event) => {
                                const apellidos = event.target.value.trim();
                                if (apellidos !== acceso.apellidos) void guardar(acceso, { apellidos });
                              }}
                            />
                          </div>
                          <span className="truncate text-xs text-muted-foreground">{acceso.email}</span>
                          <span className="flex flex-wrap gap-1">
                            {acceso.cargo ? <Badge variant="secondary">{CARGO_LABEL[acceso.cargo]}</Badge> : null}
                            {acceso.es_admin ? <Badge className="cuentas-badge-admin-react">Admin</Badge> : null}
                            {acceso.activo ? null : <Badge variant="outline">Pendiente</Badge>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-2" data-label="Departamentos">
                      <Preferencias
                        idPrefix={`acceso-${acceso.id}`}
                        equipos={equipos}
                        onChange={(siguientes) => cambiarPreferencias(acceso, siguientes)}
                      />
                      {faltaSegunda || (borradores[acceso.id] && equipos.length < MIN_EQUIPOS) ? (
                        <p className="mt-1 text-xs text-[var(--color-error-text)]">Falta la 2ª preferencia.</p>
                      ) : null}
                    </td>
                    <td className="p-2" data-label="VP de">
                      <VpDeCheckboxes
                        idPrefix={`acceso-${acceso.id}`}
                        equipos={acceso.equipos}
                        selected={acceso.vp_de}
                        onChange={(vp_de) => void guardar(acceso, { vp_de })}
                      />
                    </td>
                    <td className="p-2" data-label="Cargo">
                      <CargoSelect value={acceso.cargo} onChange={(cargo) => void guardar(acceso, { cargo })} />
                    </td>
                    <td className="p-2" data-label="Admin">
                      <label className="flex items-center gap-1.5">
                        <Checkbox
                          checked={acceso.es_admin}
                          onCheckedChange={(marcado) => void guardar(acceso, { es_admin: marcado === true })}
                          aria-label={`Admin: ${acceso.nombre || acceso.email}`}
                        />
                        <ShieldCheck aria-hidden="true" className="size-4 text-muted-foreground" />
                      </label>
                    </td>
                    <td className="p-2" data-label="Mentor">
                      <Select
                        value={acceso.mentor_email || "none"}
                        onValueChange={(value) =>
                          void guardar(acceso, { mentor_email: value === "none" ? "" : value })
                        }
                      >
                        <SelectTrigger size="sm" className="w-36">
                          <SelectValue placeholder="Sin mentor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin mentor</SelectItem>
                          {accesos
                            .filter((otro) => otro.id !== acceso.id)
                            .map((otro) => (
                              <SelectItem key={otro.id} value={otro.email}>
                                {otro.nombre || otro.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2" data-label="DNI y correo personal">
                      <div className="flex flex-col gap-1.5">
                        <Input
                          defaultValue={acceso.dni}
                          placeholder="DNI / NIE"
                          aria-label={`DNI de ${acceso.email}`}
                          className="h-8 w-40"
                          onBlur={(event) => {
                            const dni = event.target.value.trim();
                            if (dni !== acceso.dni) void guardar(acceso, { dni });
                          }}
                        />
                        <Input
                          defaultValue={acceso.correo_personal}
                          placeholder="Correo personal"
                          aria-label={`Correo personal de ${acceso.email}`}
                          className="h-8 w-40"
                          onBlur={(event) => {
                            const correo_personal = event.target.value.trim();
                            if (correo_personal !== acceso.correo_personal) {
                              void guardar(acceso, { correo_personal });
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-2" data-label="Estado">
                      <div className="flex flex-col gap-1.5">
                        <Button
                          type="button"
                          variant={acceso.activo ? "outline" : "default"}
                          size="sm"
                          onClick={() => void guardar(acceso, { activo: !acceso.activo })}
                        >
                          {acceso.activo ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setBorrando(acceso)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {ordenados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-2 text-muted-foreground">
                    {accesos.length === 0
                      ? "Todavía no hay cuentas dadas de alta."
                      : `Nadie coincide con «${busqueda.trim()}».`}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleCrear}>
        <h3>Añadir nueva persona</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nuevo-equipo-nombre">Nombre</Label>
            <Input
              type="text"
              id="nuevo-equipo-nombre"
              value={nuevoNombre}
              maxLength={80}
              onChange={(event) => setNuevoNombre(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nuevo-equipo-apellidos">Apellidos</Label>
            <Input
              type="text"
              id="nuevo-equipo-apellidos"
              value={nuevosApellidos}
              maxLength={80}
              onChange={(event) => setNuevosApellidos(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nuevo-equipo-email">Email</Label>
            <Input
              type="email"
              id="nuevo-equipo-email"
              value={nuevoEmail}
              onChange={(event) => setNuevoEmail(event.target.value)}
              required
            />
            {accesoExistente ? (
              <p className="text-sm text-[var(--color-error-text)]">
                Ya hay una cuenta con ese email{accesoExistente.nombre ? ` (${accesoExistente.nombre})` : ""}
                . Edítala en la tabla de arriba en vez de crear otra.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nuevo-equipo-password">Contraseña</Label>
            <Input
              type="password"
              id="nuevo-equipo-password"
              value={nuevaPassword}
              onChange={(event) => setNuevaPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nuevo-equipo-pref-0">Departamentos</Label>
            <Preferencias
              idPrefix="nuevo-equipo"
              equipos={nuevosEquipos}
              onChange={(equipos) => {
                setNuevosEquipos(equipos);
                setNuevoVpDe((vp) => vp.filter((v) => equipos.includes(v)));
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>VP de</Label>
            <VpDeCheckboxes
              idPrefix="nuevo-equipo"
              equipos={nuevosEquipos}
              selected={nuevoVpDe}
              onChange={setNuevoVpDe}
            />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nuevo-equipo-cargo">Cargo</Label>
              <CargoSelect id="nuevo-equipo-cargo" value={nuevoCargo} onChange={setNuevoCargo} />
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="nuevo-equipo-admin"
                checked={nuevoAdmin}
                onCheckedChange={(marcado) => setNuevoAdmin(marcado === true)}
              />
              <Label htmlFor="nuevo-equipo-admin" className="font-normal">
                Admin (inscripciones, cuentas, calendario del club)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:w-1/2">
          <Label>Mentor</Label>
          <Select
            value={nuevoMentor || "none"}
            onValueChange={(value) => setNuevoMentor(value === "none" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin mentor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin mentor</SelectItem>
              {accesos.map((acceso) => (
                <SelectItem key={acceso.id} value={acceso.email}>
                  {acceso.nombre || acceso.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={isSaving || !nuevoValido || !!accesoExistente} className="sm:w-fit">
          {isSaving ? "Creando..." : "Crear cuenta"}
        </Button>
      </form>

      <AlertDialog open={borrando !== null} onOpenChange={(open) => !open && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              {borrando?.nombre || borrando?.email} dejará de poder entrar y se borrarán sus datos
              personales. Si solo quieres cortarle el acceso, usa «Desactivar». No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => borrando && void handleEliminar(borrando)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
