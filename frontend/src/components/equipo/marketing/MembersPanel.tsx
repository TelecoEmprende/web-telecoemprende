import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

import { useApi, useDepto } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { AvatarResponsable, etiquetaDe, nivelCarga, type NivelCarga } from "./Avatares";
import { MemberDialog } from "./MemberDialog";
import type { ApiFailure } from "../../../types/api";
import type { Miembro } from "../../../types/marketing";

const TEAM_LABEL: Record<string, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

/** Color por departamento para el chip de la columna "Departamentos": mismo
 *  criterio que la agenda del club (`CalendarioEquipo`) -- naranja Marketing,
 *  noche Eventos, azul Ingeniería/Tech. */
const DEPTO_CLASE: Record<string, string> = {
  marketing: "mkt-agenda-marketing-react",
  eventos: "mkt-agenda-eventos-react",
  ingenieria: "mkt-agenda-ingenieria-react",
};

/** El chip de carga: lo que hace útil el directorio para repartir trabajo. */
function Carga({ abiertas }: { abiertas: number }) {
  const nivel = nivelCarga(abiertas);
  if (nivel === "libre") {
    return <span className="mkt-carga-react mkt-carga-libre-react">Libre</span>;
  }

  return (
    <span className={`mkt-carga-react mkt-carga-${nivel}-react`}>
      {abiertas === 1 ? "1 tarea abierta" : `${abiertas} tareas abiertas`}
    </span>
  );
}

export function MembersPanel() {
  const { getMiembros } = useApi();
  const depto = useDepto();

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [filtroCarga, setFiltroCarga] = useState<"" | NivelCarga>("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await getMiembros();
      setMiembros(respuesta.miembros);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudieron cargar los miembros.");
    } finally {
      setIsLoading(false);
    }
  }, [getMiembros]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Las habilidades que existen de verdad, no una lista fija. */
  const habilidades = useMemo(
    () => [...new Set(miembros.flatMap((m) => m.tags))].sort(),
    [miembros],
  );

  const visibles = useMemo(
    () =>
      miembros
        .filter((m) => filtro === null || m.tags.includes(filtro))
        .filter((m) => filtroCarga === "" || nivelCarga(m.abiertas) === filtroCarga)
        // Más libres primero: el directorio se abre para decidir a quién
        // asignar algo, y esa es la respuesta.
        .slice()
        .sort((a, b) => a.abiertas - b.abiertas || a.email.localeCompare(b.email)),
    [miembros, filtro, filtroCarga],
  );

  /** Confirmación visual breve de "email copiado", sin depender de un toast. */
  async function copiarEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiado(email);
      setTimeout(() => setCopiado((actual) => (actual === email ? null : actual)), 1500);
    } catch {
      // Sin permiso de portapapeles: no hay nada más que hacer aquí.
    }
  }

  if (isLoading) return <Esqueleto filas={4} alto={68} />;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="mkt-panel-header-react">
        <h3>Miembros de {TEAM_LABEL[depto] ?? depto}</h3>
        <div className="flex flex-wrap items-center gap-3">
          {habilidades.length > 0 ? (
            <div className="mkt-filtros-react" role="group" aria-label="Filtrar por habilidad">
              <button
                type="button"
                className="mkt-btn-mini-react"
                aria-pressed={filtro === null}
                onClick={() => setFiltro(null)}
              >
                Todos
              </button>
              {habilidades.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="mkt-btn-mini-react"
                  aria-pressed={filtro === tag}
                  onClick={() => setFiltro(filtro === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={filtroCarga}
            onChange={(e) => setFiltroCarga(e.target.value as "" | NivelCarga)}
            aria-label="Filtrar por carga"
          >
            <option value="">Cualquier carga</option>
            <option value="libre">Solo libres</option>
            <option value="media">Carga media</option>
            <option value="alta">Carga alta</option>
          </select>
        </div>
      </header>

      {visibles.length === 0 ? (
        <p className="mkt-vacio-react">
          {miembros.length === 0
            ? "No hay nadie con acceso a este departamento todavía. Los accesos se dan de alta desde el panel de administración."
            : filtro !== null && filtroCarga !== ""
              ? "Nadie tiene esa habilidad con esa carga."
              : filtro !== null
                ? "Nadie tiene esa habilidad apuntada todavía."
                : "Nadie tiene esa carga ahora mismo."}
        </p>
      ) : (
        <>
          <div className="mkt-directorio-cabecera-react" aria-hidden="true">
            <span>Miembro</span>
            <span>Departamentos</span>
            <span>Rol y habilidades</span>
            <span>Actividad</span>
          </div>
          <ul className="mkt-miembros-react mkt-directorio-react">
          {visibles.map((miembro) => (
            <li key={miembro.email} className="mkt-miembro-fila-react">
              <button
                type="button"
                className="mkt-miembro-react"
                onClick={() => setAbierto(miembro.email)}
              >
                <span className="mkt-miembro-col-miembro-react">
                  <AvatarResponsable email={miembro.email} nombre={miembro.nombre} />
                  <span className="mkt-miembro-nombre-react">
                    {etiquetaDe(miembro.email, miembro.nombre)}
                  </span>
                </span>
                <span className="mkt-deptos-react">
                  {miembro.equipos.map((equipo) => (
                    <span
                      key={equipo}
                      className={`mkt-depto-chip-react ${DEPTO_CLASE[equipo] ?? ""}`}
                    >
                      {TEAM_LABEL[equipo] ?? equipo}
                    </span>
                  ))}
                </span>
                {miembro.tags.length > 0 ? (
                  <span className="mkt-tags-react">
                    {miembro.tags.map((tag) => (
                      <span key={tag} className="mkt-tag-react">
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="mkt-meta-react">Sin habilidades apuntadas</span>
                )}
                <Carga abiertas={miembro.abiertas} />
              </button>
              {/* Acciones rápidas sin entrar a la ficha -- no hay teléfono en
                  equipo_accesos, así que no hay enlace de WhatsApp por persona. */}
              <span className="mkt-miembro-acciones-react">
                <button
                  type="button"
                  className="mkt-icon-btn-react"
                  title="Copiar email"
                  onClick={() => void copiarEmail(miembro.email)}
                >
                  {copiado === miembro.email ? (
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span className="sr-only">Copiar email</span>
                </button>
                <a className="mkt-icon-btn-react" title="Enviar email" href={`mailto:${miembro.email}`}>
                  <Mail size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span className="sr-only">Enviar email</span>
                </a>
              </span>
            </li>
          ))}
          </ul>
        </>
      )}

      {abierto !== null ? (
        <MemberDialog
          email={abierto}
          habilidadesConocidas={habilidades}
          onCerrar={() => setAbierto(null)}
          onGuardado={() => void cargar()}
        />
      ) : null}
    </section>
  );
}
