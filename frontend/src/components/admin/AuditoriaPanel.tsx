import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { getAuditoria, type RegistroAuditoria } from "../../api/admin";
import { AlertBanner } from "../feedback/AlertBanner";
import { Input } from "../ui/input";
import type { ApiFailure } from "../../types/api";
import { DEPTO_LABEL, type Team } from "../../types/equipo";

/** Qué es cada trozo de ruta, en palabras. */
const RECURSO: Record<string, string> = {
  tasks: "la tarea",
  campaigns: "el proyecto",
  contents: "el entregable",
  notas: "la nota",
  comments: "un comentario",
  equipo: "la cuenta",
  registrations: "la inscripción",
  calendario: "un evento del calendario",
  reuniones: "la reunión",
  presupuesto: "una partida de presupuesto",
  servicios: "el servicio",
  anuncios: "un aviso",
  decisiones: "una decisión",
  recursos: "un recurso",
  alumni: "un alumni",
  miembros: "la ficha de un miembro",
  "datos-formulario": "sus datos personales",
};

const VERBO: Record<string, string> = {
  POST: "Creó",
  PUT: "Editó",
  PATCH: "Editó",
  DELETE: "Borró",
  GET: "Descargó",
};

/** "Borró la tarea #12 · Marketing" a partir de `DELETE /api/marketing/tasks/12`. */
export function describir({ metodo, ruta, estado }: Pick<RegistroAuditoria, "metodo" | "ruta" | "estado">) {
  if (ruta === "/api/equipo/login") return estado < 400 ? "Inició sesión" : "Intento de entrar fallido";
  if (ruta === "/api/equipo/logout" || ruta === "/api/admin/logout") return "Cerró sesión";
  if (ruta === "/api/equipo/registro") return "Pidió una cuenta";
  if (ruta.startsWith("/api/admin/equipo/excel")) return "Descargó el Excel de datos del equipo";
  if (ruta.startsWith("/api/admin/equipo/pdf")) return "Descargó el PDF del equipo";
  if (ruta.startsWith("/api/admin/download")) return "Descargó el Excel de inscripciones";

  const [, , area, ...resto] = ruta.split("/");
  const recurso = resto.find((trozo) => RECURSO[trozo]);
  const id = resto.find((trozo) => /^\d+$/.test(trozo));
  const depto = DEPTO_LABEL[area as Team];
  if (!recurso) return `${metodo} ${ruta}`;
  return [
    `${VERBO[metodo] ?? metodo} ${RECURSO[recurso]}${id ? ` #${id}` : ""}`,
    depto,
  ]
    .filter(Boolean)
    .join(" · ");
}

const FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Auditoría: quién cambió qué en /equipo y cuándo (ver
 * `backend/services/auditoria.py`). Solo lectura; lo último arriba. El
 * buscador filtra en el servidor por email o por ruta (`tasks`, `notas`...).
 */
export function AuditoriaPanel() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    // Espera a que se deje de teclear: una petición por búsqueda, no por letra.
    const espera = setTimeout(() => {
      getAuditoria(busqueda.trim())
        .then((r) => {
          if (activo) setRegistros(r.registros);
        })
        .catch((err) => {
          if (activo) setError((err as ApiFailure).message || "No se pudo cargar la auditoría.");
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
    }, 250);
    return () => {
      activo = false;
      clearTimeout(espera);
    };
  }, [busqueda]);

  return (
    <section className="admin-card-react shadcn-scope">
      <p className="max-w-[72ch]">
        Cada cambio hecho en /equipo, las entradas y salidas y las descargas de datos personales.
        Se guarda quién, qué y cuándo, nunca lo que se escribió.
      </p>

      <div className="cuentas-buscador-react mt-4">
        <Search aria-hidden="true" />
        <Input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por email o por lo que se tocó (tasks, notas...)"
          aria-label="Buscar en la auditoría"
        />
      </div>

      {error ? <AlertBanner variant="error" message={error} /> : null}

      {cargando ? (
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      ) : registros.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          {busqueda.trim() ? `Nada coincide con «${busqueda.trim()}».` : "Todavía no hay nada registrado."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="auditoria-tabla-react w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Cuándo</th>
                <th className="px-2 py-2 font-medium">Quién</th>
                <th className="px-2 py-2 font-medium">Qué</th>
                <th className="px-2 py-2 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                    {FECHA.format(new Date(r.momento))}
                  </td>
                  <td className="px-2 py-2">{r.email || "Sin sesión"}</td>
                  <td className="px-2 py-2" title={`${r.metodo} ${r.ruta} · IP ${r.ip || "?"}`}>
                    {describir(r)}
                  </td>
                  <td className="px-2 py-2">
                    <span className={r.estado < 400 ? "auditoria-ok-react" : "auditoria-error-react"}>
                      {r.estado < 400 ? "Hecho" : `Rechazado (${r.estado})`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
