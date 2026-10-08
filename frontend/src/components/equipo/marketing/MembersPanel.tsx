import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

import { apiDepto } from "../../../api/marketing";
import { DeptoProvider } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { AvatarResponsable, etiquetaDe, nivelCarga, type NivelCarga } from "./Avatares";
import { MemberDialog } from "./MemberDialog";
import { useEntradaDeFila } from "../../movimiento";
import type { ApiFailure } from "../../../types/api";
import { DEPTO_LABEL, type Team } from "../../../types/equipo";
import type { Miembro } from "../../../types/marketing";

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

type Props = {
  /** Departamentos de la persona: el directorio junta a los de todos. Con
   *  dos departamentos como mínimo por persona (de tres), eso es el club
   *  entero. */
  deptos: Team[];
};

export function MembersPanel({ deptos }: Props) {
  const entradaFila = useEntradaDeFila();

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  // Departamento a la vista; null = todos. Dentro del panel y no en la barra:
  // ahí no había forma de volver a "todos".
  const [filtroDepto, setFiltroDepto] = useState<Team | null>(null);
  const [filtroCarga, setFiltroCarga] = useState<"" | NivelCarga>("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const claveDeptos = deptos.join(",");
  const cargar = useCallback(async () => {
    try {
      const respuestas = await Promise.all(deptos.map((d) => apiDepto(d).getMiembros()));
      // Quien está en varios sale una vez; sus tareas abiertas (que son por
      // departamento) se suman.
      const porEmail = new Map<string, Miembro>();
      for (const r of respuestas)
        for (const m of r.miembros) {
          const previo = porEmail.get(m.email);
          porEmail.set(m.email, previo ? { ...m, abiertas: previo.abiertas + m.abiertas } : m);
        }
      setMiembros([...porEmail.values()]);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudieron cargar los miembros.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDeptos]);

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
        .filter((m) => filtroDepto === null || m.equipos.includes(filtroDepto))
        .filter((m) => filtro === null || m.tags.includes(filtro))
        .filter((m) => filtroCarga === "" || nivelCarga(m.abiertas) === filtroCarga)
        // Más libres primero: el directorio se abre para decidir a quién
        // asignar algo, y esa es la respuesta.
        .slice()
        .sort((a, b) => a.abiertas - b.abiertas || a.email.localeCompare(b.email)),
    [miembros, filtro, filtroCarga, filtroDepto],
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

      <header className="crm-cabecera-react">
        <h3 className="crm-h1">
          {filtroDepto ?? (deptos.length === 1 ? deptos[0] : null)
            ? `Miembros de ${DEPTO_LABEL[(filtroDepto ?? deptos[0]) as Team]}`
            : "Miembros del club"}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {deptos.length > 1 ? (
            <div className="crm-tags-react" role="group" aria-label="Filtrar por departamento">
              {[null, ...deptos].map((d) => (
                <button
                  key={d ?? "todos"}
                  type="button"
                  className={`crm-tag${filtroDepto === d ? " crm-tag-azul-react" : ""}`}
                  aria-pressed={filtroDepto === d}
                  onClick={() => setFiltroDepto(d)}
                >
                  {d ? DEPTO_LABEL[d] : "Todos"}
                </button>
              ))}
            </div>
          ) : null}
          {habilidades.length > 0 ? (
            <div className="crm-tags-react" role="group" aria-label="Filtrar por habilidad">
              <button
                type="button"
                className={`crm-tag${filtro === null ? " crm-tag-azul-react" : ""}`}
                aria-pressed={filtro === null}
                onClick={() => setFiltro(null)}
              >
                Todos
              </button>
              {habilidades.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`crm-tag${filtro === tag ? " crm-tag-azul-react" : ""}`}
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
          <div className="crm-c">
          <div className="mkt-directorio-cabecera-react" aria-hidden="true">
            <span>Miembro</span>
            <span>Departamentos</span>
            <span>Rol y habilidades</span>
            <span>Actividad</span>
          </div>
          <ul className="mkt-miembros-react mkt-directorio-react">
          {visibles.map((miembro, indice) => (
            <motion.li
              key={miembro.email}
              className="mkt-miembro-fila-react"
              {...entradaFila(indice)}
            >
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
                      {DEPTO_LABEL[equipo as Team] ?? equipo}
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
            </motion.li>
          ))}
          </ul>
          </div>
        </>
      )}

      {abierto !== null ? (
        // La ficha se pide por la ruta de un departamento que la persona y
        // tú compartís: es lo que el backend exige para enseñarla.
        <DeptoProvider
          value={
            deptos.find((d) => miembros.find((m) => m.email === abierto)?.equipos.includes(d)) ??
            deptos[0]
          }
        >
          <MemberDialog
            email={abierto}
            habilidadesConocidas={habilidades}
            onCerrar={() => setAbierto(null)}
            onGuardado={() => void cargar()}
          />
        </DeptoProvider>
      ) : null}
    </section>
  );
}
