import { useEffect, useState, type FormEvent } from "react";

import { updateRegistration } from "../../api/admin";
import { UPM_SCHOOLS } from "../../data/upmSchools";
import type { Registro } from "../../types/admin";
import type { ApiFailure } from "../../types/api";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const DEPARTAMENTOS = ["Tech/Ingeniería", "Marketing/Comms", "Eventos/Logística"];
const NIVELES = ["Grado", "Máster"];
// Radix rechaza un SelectItem con value="", así que los huecos vacíos
// ("—", "sin elegir") viajan como este centinela y se traducen en los bordes.
const SIN_VALOR = "none";

export type EditData = {
  nombre: string;
  apellidos: string;
  escuela: string;
  nivel: string;
  estudios: string;
  email: string;
  telefono: string;
  departamento: string;
  drive_link: string;
};

/** Los que el backend exige. Escuela y nivel pueden quedarse vacíos: hay filas
 *  antiguas que se guardaron antes de que el formulario los pidiera. */
const OBLIGATORIOS: (keyof EditData)[] = [
  "nombre",
  "apellidos",
  "estudios",
  "email",
  "telefono",
  "departamento",
  "drive_link",
];

function datosDe(registro: Registro): EditData {
  return {
    nombre: registro.nombre,
    apellidos: registro.apellidos,
    escuela: registro.escuela,
    nivel: registro.nivel,
    estudios: registro.estudios,
    email: registro.email,
    telefono: registro.telefono,
    departamento: registro.departamento,
    drive_link: registro.drive_link,
  };
}

type Props = {
  /** El registro que se edita, o null con el diálogo cerrado. */
  registro: Registro | null;
  onClose: () => void;
  onGuardado: (id: number, data: EditData) => void;
};

export function RegistroDialog({ registro, onClose, onGuardado }: Props) {
  const [datos, setDatos] = useState<EditData | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada apertura arranca del registro que se abrió, no de lo que quedara
  // escrito la vez anterior.
  useEffect(() => {
    setDatos(registro ? datosDe(registro) : null);
    setError(null);
  }, [registro]);

  if (!registro || !datos) return null;

  const campo = (clave: keyof EditData) => ({
    id: clave,
    value: datos[clave],
    onChange: (event: { target: { value: string } }) =>
      setDatos({ ...datos, [clave]: event.target.value }),
  });

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!datos || !registro) return;

    if (OBLIGATORIOS.some((clave) => !datos[clave])) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const respuesta = await updateRegistration(registro.id, datos);
      if (respuesta.ok) {
        onGuardado(registro.id, datos);
        onClose();
      }
    } catch (e) {
      setError((e as ApiFailure).message || "Error al actualizar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Editar inscripción</DialogTitle>
          <DialogDescription>
            {registro.nombre} {registro.apellidos} · {registro.fecha}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-[var(--color-error-bg)] px-3.5 py-2.5 text-sm font-bold text-[var(--color-error-text)] sm:col-span-2"
            >
              {error}
            </p>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input {...campo("nombre")} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input {...campo("apellidos")} />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="escuela">Escuela</Label>
            <Select
              value={datos.escuela || SIN_VALOR}
              onValueChange={(valor) =>
                setDatos({ ...datos, escuela: valor === SIN_VALOR ? "" : valor })
              }
            >
              <SelectTrigger id="escuela" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_VALOR}>—</SelectItem>
                {UPM_SCHOOLS.map((escuela) => (
                  <SelectItem value={escuela.name} key={escuela.code}>
                    {escuela.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nivel">Nivel</Label>
            <Select
              value={datos.nivel || SIN_VALOR}
              onValueChange={(valor) =>
                setDatos({ ...datos, nivel: valor === SIN_VALOR ? "" : valor })
              }
            >
              <SelectTrigger id="nivel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_VALOR}>—</SelectItem>
                {NIVELES.map((opcion) => (
                  <SelectItem value={opcion} key={opcion}>
                    {opcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="estudios">Grado / Máster</Label>
            <Input {...campo("estudios")} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input type="email" {...campo("email")} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input type="tel" {...campo("telefono")} />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="departamento">Departamento</Label>
            <Select
              value={datos.departamento || undefined}
              onValueChange={(valor) => setDatos({ ...datos, departamento: valor })}
            >
              <SelectTrigger id="departamento" className="w-full">
                <SelectValue placeholder="Elige un departamento" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTAMENTOS.map((opcion) => (
                  <SelectItem value={opcion} key={opcion}>
                    {opcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="drive_link">CV y pitch (enlace de Drive)</Label>
            <Input type="url" {...campo("drive_link")} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
