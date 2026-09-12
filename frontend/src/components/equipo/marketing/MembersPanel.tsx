import { useCallback, useEffect, useMemo, useState } from "react";

import { useApi, useDepto } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { AvatarResponsable, etiquetaDe } from "./Avatares";
import { MemberDialog } from "./MemberDialog";
import type { ApiFailure } from "../../../types/api";
import type { Miembro } from "../../../types/marketing";

const TEAM_LABEL: Record<string, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

/** El chip de carga: lo que hace útil el directorio para repartir trabajo. */
function Carga({ abiertas }: { abiertas: number }) {
  if (abiertas === 0) {
    return <span className="mkt-carga-react mkt-carga-libre-react">Libre</span>;
  }

  // Cuatro o más ya no es "va cargado", es "no le eches nada más".
  const nivel = abiertas >= 4 ? "alta" : "media";
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
  const [abierto, setAbierto] = useState<string | null>(null);

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
      (filtro === null ? miembros : miembros.filter((m) => m.tags.includes(filtro)))
        // Más libres primero: el directorio se abre para decidir a quién
        // asignar algo, y esa es la respuesta.
        .slice()
        .sort((a, b) => a.abiertas - b.abiertas || a.email.localeCompare(b.email)),
    [miembros, filtro],
  );

  if (isLoading) return <Esqueleto filas={4} alto={68} />;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="mkt-panel-header-react">
        <h3>Miembros de {TEAM_LABEL[depto] ?? depto}</h3>
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
      </header>

      {visibles.length === 0 ? (
        <p className="mkt-vacio-react">
          {miembros.length === 0
            ? "No hay nadie con acceso a este departamento todavía. Los accesos se dan de alta desde el panel de administración."
            : "Nadie tiene esa habilidad apuntada todavía."}
        </p>
      ) : (
        <ul className="mkt-miembros-react">
          {visibles.map((miembro) => (
            <li key={miembro.email}>
              <button
                type="button"
                className="mkt-miembro-react"
                onClick={() => setAbierto(miembro.email)}
              >
                <AvatarResponsable email={miembro.email} nombre={miembro.nombre} />
                <span className="mkt-miembro-datos-react">
                  <span className="mkt-miembro-nombre-react">
                    {etiquetaDe(miembro.email, miembro.nombre)}
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
                </span>
                <Carga abiertas={miembro.abiertas} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {abierto !== null ? (
        <MemberDialog
          email={abierto}
          onCerrar={() => setAbierto(null)}
          onGuardado={() => void cargar()}
        />
      ) : null}
    </section>
  );
}
