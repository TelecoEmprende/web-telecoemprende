import { useCallback, useEffect, useState } from "react";

import { CabeceraPanel } from "../CabeceraPanel";
import { Esqueleto } from "../../feedback/Esqueleto";
import { getMesa } from "../../../api/club";
import { apiDepto } from "../../../api/marketing";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Badge } from "@/components/ui/badge";
import { AvatarResponsable, etiquetaDe } from "../marketing/Avatares";
import { Contador } from "../../movimiento";
import { etiquetaAmbito } from "./AmbitoChips";
import { HistorialLista } from "./HistorialLista";
import type { ApiFailure } from "../../../types/api";
import type { EventoHistorial, Mesa, ProyectoDeMesa } from "../../../types/club";
import { DEPTO_LABEL, type Team } from "../../../types/equipo";
import { PROYECTO_ESTADO_LABEL, diasHasta, formatearFecha } from "../../../types/marketing";

type Props = {
  /** Quién ha entrado: para «Me la quedo». */
  email: string;
  nombre: string;
  onAbrirProyecto: (id: number, departamento: Team) => void;
};

/** «Hace 3 días» / «hoy» para lo que lleva sin moverse. */
function sinMoverse(dias: number | null) {
  if (dias === null) return "Sin actividad todavía";
  if (dias === 0) return "Movido hoy";
  return dias === 1 ? "Movido ayer" : `Sin moverse ${dias} días`;
}

/** Una fase con fecha pasada y tareas sin acabar. Sin fecha no se avisa: la
 *  fecha de una fase es opcional. */
function faseVencida(f: ProyectoDeMesa["entregables"][number]) {
  const dias = f.fecha ? diasHasta(f.fecha) : null;
  return dias !== null && dias < 0 && (f.total === 0 || f.acabadas < f.total);
}

function plazo(deadline: string | null) {
  if (!deadline) return "Sin fecha";
  const dias = diasHasta(deadline);
  if (dias !== null && dias < 0) return `Venció el ${formatearFecha(deadline)}`;
  return formatearFecha(deadline);
}

/**
 * La Mesa del club: lo que se mira en la reunión semanal. Proyectos vivos con
 * responsable y siguiente paso, tareas sin dueño (cualquiera puede quedarse
 * una) y las atrasadas, más lo último que se ha movido. Todo sale de lo que ya
 * hay en el club; no se mantiene aparte.
 */
export function MesaPanel({ email, nombre, onAbrirProyecto }: Props) {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [actividad, setActividad] = useState<EventoHistorial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cogiendo, setCogiendo] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await getMesa();
      setMesa(r.mesa);
      setActividad(r.actividad);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo cargar la mesa.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function meLaQuedo(id: number, departamento: Team) {
    setCogiendo(id);
    try {
      await apiDepto(departamento).updateTask(id, { responsables: [email] });
      await cargar();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo asignar la tarea.");
    } finally {
      setCogiendo(null);
    }
  }

  if (mesa === null) return error ? <AlertBanner variant="error" message={error} /> : <Esqueleto filas={5} />;

  const yo = etiquetaDe(email, nombre);

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <CabeceraPanel descripcion="Lo que se mira en la reunión semanal: proyectos vivos con su responsable, siguiente paso y fases, tareas sin dueño y atrasadas." />

      <div className="mkt-tiles-react">
        <div className="crm-c mkt-tile-react">
          <p className="crm-k">Proyectos vivos</p>
          <Contador valor={mesa.proyectos.length} className="mkt-tile-numero-react" />
        </div>
        <div className={`crm-c mkt-tile-react${mesa.sin_responsable > 0 ? " mkt-tile-alerta-react" : ""}`}>
          <p className="crm-k">Sin responsable</p>
          <Contador valor={mesa.sin_responsable} className="mkt-tile-numero-react" />
        </div>
        <div className={`crm-c mkt-tile-react${mesa.estancados > 0 ? " mkt-tile-alerta-react" : ""}`}>
          <p className="crm-k">Sin moverse +{mesa.dias_estancado} días</p>
          <Contador valor={mesa.estancados} className="mkt-tile-numero-react" />
        </div>
        <div className={`crm-c mkt-tile-react${mesa.sin_dueno.length > 0 ? " mkt-tile-alerta-react" : ""}`}>
          <p className="crm-k">Tareas sin dueño</p>
          <Contador valor={mesa.sin_dueno.length} className="mkt-tile-numero-react" />
        </div>
        <div className={`crm-c mkt-tile-react${mesa.atrasadas.length > 0 ? " mkt-tile-alerta-react" : ""}`}>
          <p className="crm-k">Atrasadas</p>
          <Contador valor={mesa.atrasadas.length} className="mkt-tile-numero-react" />
        </div>
      </div>

      <div className="crm-c mkt-grupo-react">
        <h4 className="mkt-grupo-titulo-react">Proyectos sobre la mesa</h4>
        {mesa.proyectos.length === 0 ? (
          <p className="mkt-vacio-react">
            No hay ningún proyecto vivo. Crea uno en Proyectos para ponerlo sobre la mesa.
          </p>
        ) : (
          <ul className="mesa-proyectos-react">
            {mesa.proyectos.map((p) => {
              const pct = p.total_tasks === 0 ? 0 : Math.round((100 * p.tareas_acabadas) / p.total_tasks);
              const vencidas = p.entregables.filter(faseVencida).length;
              return (
                <li key={p.id} className={`mesa-proyecto-react${p.estancado ? " is-estancado" : ""}`}>
                  <button
                    type="button"
                    className="mesa-proyecto-nombre-react"
                    onClick={() => onAbrirProyecto(p.id, p.departamentos[0])}
                  >
                    {p.nombre}
                  </button>
                  <span className="mkt-ficha-proyecto-react">
                    {etiquetaAmbito(p.departamentos).map((e) => (
                      <Badge key={e} variant="outline">
                        {e}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className={`mkt-estado-proyecto-react is-${p.estado}`}>
                      {PROYECTO_ESTADO_LABEL[p.estado]}
                    </Badge>
                  </span>
                  <span className="mkt-responsable-react">
                    {p.responsable ? (
                      <>
                        <AvatarResponsable email={p.responsable} />
                        {etiquetaDe(p.responsable)}
                      </>
                    ) : (
                      <span className="is-vacio">Sin responsable</span>
                    )}
                  </span>
                  <span className="mesa-progreso-react" title={`${p.tareas_acabadas} de ${p.total_tasks} tareas`}>
                    <span className="mesa-barra-react" aria-hidden="true">
                      <i style={{ transform: `scaleX(${pct / 100})` }} />
                    </span>
                    {p.total_tasks === 0 ? "Sin tareas" : `${pct}%`}
                  </span>
                  <span className="mesa-siguiente-react">
                    {p.siguiente_titulo ? (
                      <>
                        <strong>Siguiente:</strong> {p.siguiente_titulo}
                        {p.siguiente_deadline ? ` · ${plazo(p.siguiente_deadline)}` : ""}
                      </>
                    ) : (
                      <em>Sin siguiente paso</em>
                    )}
                  </span>
                  <span className="mesa-movimiento-react">{sinMoverse(p.dias_sin_movimiento)}</span>
                  {p.entregables.length > 0 ? (
                    <details className="mesa-fases-react">
                      <summary>
                        Fases ({p.entregables.length}
                        {vencidas > 0 ? ` · ${vencidas} vencida${vencidas === 1 ? "" : "s"}` : ""}
                        )
                      </summary>
                      <ul>
                        {p.entregables.map((e) => (
                          <li key={e.id} className={faseVencida(e) ? "is-vencida" : undefined}>
                            {e.titulo}
                            {e.fecha ? ` · ${faseVencida(e) ? "venció el " : ""}${formatearFecha(e.fecha)}` : ""}
                            {" · "}
                            {e.total === 0 ? "sin tareas" : `${e.acabadas}/${e.total}`}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="crm-c mkt-grupo-react">
        <h4 className="mkt-grupo-titulo-react">Por persona</h4>
        {mesa.personas.length === 0 ? (
          <p className="mkt-vacio-inline-react">No hay cuentas activas.</p>
        ) : (
          <ul className="mesa-personas-react">
            {mesa.personas.map((persona) => (
              <li key={persona.email} className="mesa-persona-react">
                <span className="mkt-responsable-react">
                  <AvatarResponsable email={persona.email} />
                  {etiquetaDe(persona.email)}
                </span>
                {persona.tareas.length === 0 ? (
                  <em>Libre</em>
                ) : (
                  <details>
                    <summary>
                      {persona.tareas.length} abierta{persona.tareas.length === 1 ? "" : "s"}
                      {persona.atrasadas > 0 ? (
                        <strong className="is-atrasada">
                          {" "}· {persona.atrasadas} atrasada{persona.atrasadas === 1 ? "" : "s"}
                        </strong>
                      ) : null}
                    </summary>
                    <ul>
                      {persona.tareas.map((t) => (
                        <li key={t.id}>
                          {t.titulo}
                          <em>
                            {" "}· {DEPTO_LABEL[t.departamento]}
                            {t.padre ? ` · ${t.padre}` : ""}
                            {t.deadline ? ` · ${plazo(t.deadline)}` : ""}
                          </em>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mesa-columnas-react">
        <div className="crm-c mkt-grupo-react">
          <h4 className="mkt-grupo-titulo-react">Tareas sin dueño</h4>
          {mesa.sin_dueno.length === 0 ? (
            <p className="mkt-vacio-inline-react">Todas las tareas abiertas tienen quien las lleve.</p>
          ) : (
            <ul className="mesa-tareas-react">
              {mesa.sin_dueno.map((t) => (
                <li key={t.id}>
                  <span>
                    <strong>{t.titulo}</strong>
                    <em>
                      {DEPTO_LABEL[t.departamento]}
                      {t.padre ? ` · ${t.padre}` : ""}
                      {t.deadline ? ` · ${plazo(t.deadline)}` : ""}
                    </em>
                  </span>
                  <button
                    type="button"
                    className="mkt-btn-mini-react"
                    disabled={cogiendo === t.id}
                    onClick={() => void meLaQuedo(t.id, t.departamento)}
                    title={`Asignarte la tarea (${yo})`}
                  >
                    {cogiendo === t.id ? "..." : "Me la quedo"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="crm-c mkt-grupo-react">
          <h4 className="mkt-grupo-titulo-react">Atrasadas</h4>
          {mesa.atrasadas.length === 0 ? (
            <p className="mkt-vacio-inline-react">Nada atrasado. Así da gusto.</p>
          ) : (
            <ul className="mesa-tareas-react">
              {mesa.atrasadas.map((t) => (
                <li key={t.id}>
                  <span>
                    <strong>{t.titulo}</strong>
                    <em>
                      {DEPTO_LABEL[t.departamento]}
                      {t.padre ? ` · ${t.padre}` : ""}
                      {` · ${plazo(t.deadline)}`}
                    </em>
                  </span>
                  <span className="mkt-responsable-react">
                    {(t.responsables ?? []).length > 0
                      ? (t.responsables ?? []).map((r) => etiquetaDe(r)).join(", ")
                      : "Sin dueño"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="crm-c mkt-grupo-react">
        <h4 className="mkt-grupo-titulo-react">Lo último que se ha movido</h4>
        <HistorialLista eventos={actividad} />
      </div>
    </section>
  );
}
