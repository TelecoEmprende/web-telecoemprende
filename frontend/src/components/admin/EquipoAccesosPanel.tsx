import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  createEquipoAcceso,
  deleteEquipoAcceso,
  getEquipoAccesos,
  updateEquipoAcceso,
} from "../../api/admin";
import { AlertBanner } from "../feedback/AlertBanner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { ApiFailure } from "../../types/api";
import type { Cargo, EquipoAcceso, Team } from "../../types/equipo";

const EQUIPOS: { value: Team; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "eventos", label: "Eventos" },
  { value: "ingenieria", label: "Ingeniería (acceso admin)" },
];

const CARGOS: { value: Cargo; label: string }[] = [
  { value: "", label: "Ninguno" },
  { value: "presidente", label: "Presidente" },
  { value: "boardmember", label: "Board member" },
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
    <div className="flex flex-wrap gap-3">
      {EQUIPOS.map((equipo) => {
        const id = `${idPrefix}-${equipo.value}`;
        return (
          <div key={equipo.value} className="flex items-center gap-1.5">
            <Checkbox
              id={id}
              checked={selected.includes(equipo.value)}
              onCheckedChange={() => toggle(equipo.value)}
            />
            <Label htmlFor={id} className="text-sm font-normal">
              {equipo.label}
            </Label>
          </div>
        );
      })}
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
  function toggle(team: Team) {
    onChange(selected.includes(team) ? selected.filter((e) => e !== team) : [...selected, team]);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {EQUIPOS.map((equipo) => {
        const disabled = !equipos.includes(equipo.value);
        const id = `${idPrefix}-vp-${equipo.value}`;
        return (
          <div key={equipo.value} className="flex items-center gap-1.5">
            <Checkbox
              id={id}
              disabled={disabled}
              checked={!disabled && selected.includes(equipo.value)}
              onCheckedChange={() => toggle(equipo.value)}
            />
            <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
              {equipo.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

export function EquipoAccesosPanel() {
  const [searchParams] = useSearchParams();
  const [accesos, setAccesos] = useState<EquipoAcceso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");

  // Prellenado desde "Crear acceso de equipo →" en Inscripciones
  // (`RecordsTable.tsx`): una candidatura aceptada trae nombre y email, el
  // resto (escuela, programa, Drive...) no vive en `equipo_accesos` y no hay
  // que duplicarlo aquí.
  const [nuevoEmail, setNuevoEmail] = useState(searchParams.get("email") ?? "");
  const [nuevoNombre, setNuevoNombre] = useState(searchParams.get("nombre") ?? "");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [nuevosEquipos, setNuevosEquipos] = useState<Team[]>([]);
  const [nuevoVpDe, setNuevoVpDe] = useState<Team[]>([]);
  const [nuevoCargo, setNuevoCargo] = useState<Cargo>("");

  // El prellenado desde una candidatura aceptada (ver comentario arriba)
  // puede apuntar a un email que ya tiene acceso -- sin este aviso, "Crear
  // acceso" lo intenta igual y el único feedback es el 400 genérico del
  // backend en vez de decir dónde está ya la persona.
  const accesoExistente = useMemo(
    () => accesos.find((a) => a.email.trim().toLowerCase() === nuevoEmail.trim().toLowerCase()),
    [accesos, nuevoEmail],
  );

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
      const response = await createEquipoAcceso(
        nuevoEmail,
        nuevaPassword,
        nuevosEquipos,
        nuevoVpDe,
        nuevoCargo,
        nuevoNombre,
      );
      if (response.ok) {
        setMessageVariant("success");
        setMessage("Acceso creado.");
        setNuevoEmail("");
        setNuevoNombre("");
        setNuevaPassword("");
        setNuevosEquipos([]);
        setNuevoVpDe([]);
        setNuevoCargo("");
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
      // Al quitar un equipo, el backend rechaza vp_de que ya no esté en
      // equipos: se recorta aquí también para no depender solo del 400.
      const vpDe = acceso.vp_de.filter((v) => equipos.includes(v));
      const response = await updateEquipoAcceso(acceso.id, { equipos, vp_de: vpDe });
      if (response.ok) {
        setAccesos((prev) =>
          prev.map((a) => (a.id === acceso.id ? { ...a, equipos, vp_de: vpDe } : a)),
        );
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo actualizar el acceso.");
    }
  }

  async function handleVpDeChange(acceso: EquipoAcceso, vpDe: Team[]) {
    try {
      const response = await updateEquipoAcceso(acceso.id, { vp_de: vpDe });
      if (response.ok) {
        setAccesos((prev) => prev.map((a) => (a.id === acceso.id ? { ...a, vp_de: vpDe } : a)));
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo actualizar el acceso.");
    }
  }

  async function handleCargoChange(acceso: EquipoAcceso, cargo: Cargo) {
    try {
      const response = await updateEquipoAcceso(acceso.id, { cargo });
      if (response.ok) {
        setAccesos((prev) => prev.map((a) => (a.id === acceso.id ? { ...a, cargo } : a)));
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo actualizar el acceso.");
    }
  }

  async function handleNombreChange(acceso: EquipoAcceso, nombre: string) {
    if (nombre === acceso.nombre) return;
    try {
      const response = await updateEquipoAcceso(acceso.id, { nombre });
      if (response.ok) {
        setAccesos((prev) => prev.map((a) => (a.id === acceso.id ? { ...a, nombre } : a)));
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
    <section className="admin-card-react equipo-accesos-panel-react shadcn-scope">
      <h2>Accesos de equipo (/equipo)</h2>
      <p>
        Quien tenga el equipo <strong>Ingeniería</strong> también recibe acceso a este panel
        de administración al iniciar sesión en /equipo.
      </p>

      {message ? <AlertBanner variant={messageVariant} message={message} /> : null}

      {isLoading ? (
        <p>Cargando accesos...</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 font-medium">Nombre</th>
                <th className="px-2 font-medium">Email</th>
                <th className="px-2 font-medium">Equipos</th>
                <th className="px-2 font-medium">VP de</th>
                <th className="px-2 font-medium">Cargo</th>
                <th className="px-2 font-medium">Activo</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {accesos.map((acceso) => (
                <tr key={acceso.id} className="rounded-lg bg-card align-top ring-1 ring-foreground/10">
                  <td className="p-2">
                    <Input
                      defaultValue={acceso.nombre}
                      placeholder="Sin rellenar"
                      className="h-8 w-36"
                      onBlur={(event) => void handleNombreChange(acceso, event.target.value.trim())}
                    />
                  </td>
                  <td className="p-2 font-medium">
                    {acceso.email}
                    {acceso.cargo ? (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        {acceso.cargo === "presidente" ? "Presidente" : "Board"}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="p-2">
                    <EquiposCheckboxes
                      idPrefix={`acceso-${acceso.id}`}
                      selected={acceso.equipos}
                      onChange={(equipos) => void handleEquiposChange(acceso, equipos)}
                    />
                  </td>
                  <td className="p-2">
                    <VpDeCheckboxes
                      idPrefix={`acceso-${acceso.id}`}
                      equipos={acceso.equipos}
                      selected={acceso.vp_de}
                      onChange={(vpDe) => void handleVpDeChange(acceso, vpDe)}
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={acceso.cargo || "none"}
                      onValueChange={(value) =>
                        void handleCargoChange(acceso, value === "none" ? "" : (value as Cargo))
                      }
                    >
                      <SelectTrigger size="sm">
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
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleToggleActivo(acceso)}
                    >
                      {acceso.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleEliminar(acceso)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
              {accesos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-2 text-muted-foreground">
                    Todavía no hay accesos de equipo dados de alta.
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
                Ya hay un acceso con ese email{accesoExistente.nombre ? ` (${accesoExistente.nombre})` : ""}
                . Edítalo en la tabla de arriba en vez de crear uno nuevo.
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

        <div className="flex flex-col gap-1.5">
          <Label>Equipos</Label>
          <EquiposCheckboxes idPrefix="nuevo-equipo" selected={nuevosEquipos} onChange={setNuevosEquipos} />
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

        <div className="flex flex-col gap-1.5 sm:w-56">
          <Label>Cargo</Label>
          <Select
            value={nuevoCargo || "none"}
            onValueChange={(value) => setNuevoCargo(value === "none" ? "" : (value as Cargo))}
          >
            <SelectTrigger>
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
        </div>

        <Button
          type="submit"
          disabled={isSaving || nuevosEquipos.length === 0 || !!accesoExistente}
          className="sm:w-fit"
        >
          {isSaving ? "Creando..." : "Crear acceso"}
        </Button>
      </form>
    </section>
  );
}
