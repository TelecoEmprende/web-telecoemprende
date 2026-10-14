import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getMiembrosClub } from "../../../api/marketing";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import {
  AvatarResponsable,
  etiquetaDe,
  mediaAbiertas,
  nivelCarga,
  sobrecargado,
  type NivelCarga,
} from "./Avatares";
import { MemberDialog } from "./MemberDialog";
import { useEntradaDeFila } from "../../movimiento";
import type { ApiFailure } from "../../../types/api";
import { CARGO_LABEL, DEPTO_LABEL, TEAMS, type Team } from "../../../types/equipo";
import type { Miembro } from "../../../types/marketing";

/** Color por departamento para el chip de preferencias: mismo criterio que la
 *  agenda del club (`CalendarioEquipo`) -- naranja Marketing, noche Eventos,
 *  azul Ingeniería/Tech. */
const DEPTO_CLASE: Record<string, string> = {
  marketing: "mkt-agenda-marketing-react",
  eventos: "mkt-agenda-eventos-react",
  ingenieria: "mkt-agenda-ingenieria-react",
};

/** El chip de carga: lo que hace útil el directorio para repartir trabajo. */
function Carga({ abiertas, media }: { abiertas: number; media: number }) {
  const nivel = nivelCarga(abiertas);
  if (nivel === "libre") {
    return <span className="mkt-carga-react mkt-carga-libre-react">Libre</span>;
  }

  return (
    <span className={`mkt-carga-react mkt-carga-${nivel}-react`}>
      {abiertas === 1 ? "1 tarea abierta" : `${abiertas} tareas abiertas`}
      {sobrecargado(abiertas, media) ? " · sobrecargado" : ""}
    </span>
  );
}

/** Nombre y primer apellido, para que dos personas con el mismo nombre de pila
 *  no se confundan. */
export function nombreCorto(m: Pick<Miembro, "email" | "nombre" | "apellidos">) {
  const apellido = m.apellidos.trim().split(/\s+/)[0];
  return [etiquetaDe(m.email, m.nombre), apellido].filter(Boolean).join(" ");
}

/** Lo que se ve de la persona bajo su nombre: su cargo o VP. */
function puestoDe(m: Miembro) {
  if (m.cargo) return CARGO_LABEL[m.cargo];
  if (m.vp_de.length > 0) return `VP de ${m.vp_de.map((d) => DEPTO_LABEL[d]).join(" y ")}`;
  return "";
}

export function MembersPanel() {
  const entradaFila = useEntradaDeFila();

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  // Departamento que la persona tiene como 1ª preferencia; null = todos. Todos
  // somos de los tres, así que lo que separa a unos de otros es ese orden.
  const [filtroDepto, setFiltroDepto] = useState<Team | null>(null);
  const [filtroCarga, setFiltroCarga] = useState<"" | NivelCarga>("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await getMiembrosClub();
      setMiembros(respuesta.miembros);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudieron cargar los miembros.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Las habilidades que existen de verdad, no una lista fija. */
  const habilidades = useMemo(
    () => [...new Set(miembros.flatMap((m) => m.tags))].sort(),
    [miembros],
  );
  const media = useMemo(() => mediaAbiertas(miembros), [miembros]);

  const visibles = useMemo(
    () =>
      miembros
        .filter((m) => filtroDepto === null || m.equipos[0] === filtroDepto)
        .filter((m) => filtro === null || m.tags.includes(filtro))
        .filter((m) => filtroCarga === "" || nivelCarga(m.abiertas) === filtroCarga)
        // Más libres primero: el directorio se abre para decidir a quién
        // asignar algo, y esa es la respuesta.
        .slice()
        .sort((a, b) => a.abiertas - b.abiertas || a.email.localeCompare(b.email)),
    [miembros, filtro, filtroCarga, filtroDepto],
  );

  if (isLoading) return <Esqueleto filas={4} alto={68} />;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="crm-cabecera-react">
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="crm-tags-react" role="group" aria-label="Filtrar por 1ª preferencia">
            {[null, ...TEAMS].map((d) => (
              <button
                key={d ?? "todos"}
                type="button"
                className={`crm-tag${filtroDepto === d ? " crm-tag-activo-react" : ""}`}
                aria-pressed={filtroDepto === d}
                onClick={() => setFiltroDepto(d)}
              >
                {d ? `1ª ${DEPTO_LABEL[d]}` : "Todos"}
              </button>
            ))}
          </div>
          {habilidades.length > 0 ? (
            <div className="crm-tags-react" role="group" aria-label="Filtrar por habilidad">
              <button
                type="button"
                className={`crm-tag${filtro === null ? " crm-tag-activo-react" : ""}`}
                aria-pressed={filtro === null}
                onClick={() => setFiltro(null)}
              >
                Todas
              </button>
              {habilidades.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`crm-tag${filtro === tag ? " crm-tag-activo-react" : ""}`}
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
            ? "No hay nadie en el club todavía. Las cuentas se dan de alta desde Cuentas del equipo."
            : "Nadie coincide con esos filtros."}
        </p>
      ) : (
        <div className="crm-c mkt-directorio-caja-react">
          <div className="mkt-directorio-cabecera-react" aria-hidden="true">
            <span>Miembro</span>
            <span>Preferencias</span>
            <span>Habilidades</span>
            <span>Carga</span>
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
                    <AvatarResponsable email={miembro.email} nombre={miembro.nombre} foto={miembro.foto} />
                    <span className="mkt-miembro-textos-react">
                      <span className="mkt-miembro-nombre-react">{nombreCorto(miembro)}</span>
                      {puestoDe(miembro) ? (
                        <span className="mkt-meta-react">{puestoDe(miembro)}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="mkt-deptos-react" aria-label="Orden de preferencia">
                    {miembro.equipos.map((equipo, posicion) => (
                      <span
                        key={equipo}
                        className={`mkt-depto-chip-react ${DEPTO_CLASE[equipo] ?? ""}`}
                      >
                        {posicion + 1}ª {DEPTO_LABEL[equipo]}
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
                  <Carga abiertas={miembro.abiertas} media={media} />
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
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
