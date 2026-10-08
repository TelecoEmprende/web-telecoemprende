import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { actualizarNota, crearNota, listarNotas } from "../../../api/notas";
import type { ApiFailure } from "../../../types/api";
import type { Team } from "../../../types/equipo";
import type { NotaResumen } from "../../../types/notas";

type Props = {
  proyectoId: number;
  proyectoNombre: string;
  /** Departamento del proyecto: la nota nueva nace en él, para que la vea
   *  quien ve el proyecto. */
  departamento: Team;
  /** Abre la nota en Notas (ver `abrirNota` en `EquipoPage`). */
  onAbrirNota: (id: number) => void;
};

/**
 * Las notas enlazadas a un proyecto (`notas.proyecto_id`): el resumen, los
 * contactos, lo que se ha decidido... Se escriben en Notas, con su editor; el
 * proyecto solo las lista, deja enlazar una que ya exista o crear una nueva
 * ya enlazada. Solo salen las que la persona puede ver (privadas propias,
 * del club o de sus departamentos), igual que en Notas.
 */
export function NotasDelProyecto({ proyectoId, proyectoNombre, departamento, onAbrirNota }: Props) {
  const [enlazadas, setEnlazadas] = useState<NotaResumen[]>([]);
  const [sueltas, setSueltas] = useState<NotaResumen[]>([]);
  const [elegida, setElegida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { notas } = await listarNotas();
      setEnlazadas(notas.filter((n) => n.proyecto_id === proyectoId));
      setSueltas(notas.filter((n) => n.proyecto_id == null));
    } catch {
      setError("No se pudieron cargar las notas.");
    }
  }, [proyectoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function enlazar(id: number | null, notaId: number) {
    setError(null);
    try {
      await actualizarNota(notaId, { proyecto_id: id });
      setElegida("");
      await cargar();
    } catch (err) {
      setError((err as ApiFailure).message || "No se pudo cambiar el enlace.");
    }
  }

  async function nueva() {
    setCreando(true);
    setError(null);
    try {
      const { nota } = await crearNota({ titulo: proyectoNombre, departamento, proyecto_id: proyectoId });
      onAbrirNota(nota.id);
    } catch (err) {
      setError((err as ApiFailure).message || "No se pudo crear la nota.");
      setCreando(false);
    }
  }

  return (
    <article className="mkt-content-card-react proyecto-notas-react">
      <header>
        <div>
          <h4>Notas</h4>
          <p className="mkt-meta-react">Resumen, contactos y decisiones del proyecto, en Notas</p>
        </div>
        <button type="button" className="mkt-btn-mini-react" disabled={creando} onClick={() => void nueva()}>
          {creando ? "Creando..." : "+ Nueva nota"}
        </button>
      </header>

      {error ? <p className="proyecto-notas-error-react" role="alert">{error}</p> : null}

      {enlazadas.length > 0 ? (
        <ul className="proyecto-notas-lista-react">
          {enlazadas.map((n) => (
            <li key={n.id}>
              <button type="button" className="proyecto-nota-react" onClick={() => onAbrirNota(n.id)}>
                <FileText aria-hidden="true" />
                <span className="proyecto-nota-texto-react">
                  <strong>{n.titulo || "Sin título"}</strong>
                  <span>
                    {n.checks_pendientes > 0
                      ? `${n.checks_pendientes} ${n.checks_pendientes === 1 ? "pendiente" : "pendientes"}`
                      : n.resumen || "Vacía"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="mkt-btn-mini-react"
                aria-label={`Desenlazar ${n.titulo || "la nota"}`}
                onClick={() => void enlazar(null, n.id)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mkt-vacio-react">Ninguna nota enlazada todavía.</p>
      )}

      {sueltas.length > 0 ? (
        <div className="proyecto-notas-enlazar-react">
          <select
            value={elegida}
            aria-label="Nota que enlazar a este proyecto"
            onChange={(event) => setElegida(event.target.value)}
          >
            <option value="">Enlazar una nota que ya existe...</option>
            {sueltas.map((n) => (
              <option key={n.id} value={n.id}>
                {n.titulo || "Sin título"}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mkt-btn-mini-react"
            disabled={!elegida}
            onClick={() => void enlazar(proyectoId, Number(elegida))}
          >
            Enlazar
          </button>
        </div>
      ) : null}
    </article>
  );
}
