import { FormEvent, useEffect, useRef, useState } from "react";

import { AvataresDeResponsables } from "./Avatares";
import { SelectorMiembros } from "./SelectorMiembros";
import { TaskDialog } from "./TaskDialog";
import { apiDepto } from "../../../api/marketing";
import { DeptoProvider, useDirectorio } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { ContadorCaracteres } from "../../feedback/ContadorCaracteres";
import { Esqueleto } from "../../feedback/Esqueleto";
import { Badge } from "@/components/ui/badge";
import type { ApiFailure } from "../../../types/api";
import type { Team } from "../../../types/equipo";
import {
  MAX_TITULO_LEN,
  PRIORIDADES,
  PRIORIDAD_LABEL,
  TASK_ESTADOS,
  TASK_ESTADO_LABEL,
  diasHasta,
  formatearFecha,
  type Prioridad,
  type Task,
  type TaskEstado,
} from "../../../types/marketing";

/** Tipo MIME propio para no confundir un drag de tarea con un drag de
 *  archivo o de texto suelto que caiga sobre el tablero por error. */
const TASK_MIME = "application/x-teleco-task-id";

const ORDEN_PRIORIDAD: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

const DEPTO_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

/** La misma cajita de departamento que en "Mi semana" (ver CalendarioEquipo):
 *  un color por departamento, no una pastilla gris para los tres. */
const DEPTO_TAG: Record<string, string> = {
  ingenieria: "crm-tag-azul-react",
  marketing: "crm-tag-ambar-react",
  eventos: "",
};

/** Antes por fecha límite (sin fecha, al final), luego por prioridad: lo
 *  urgente arriba de cada columna en vez del orden en que se crearon. */
function compararTareas(a: Task, b: Task) {
  if (a.deadline !== b.deadline) {
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
  }
  return ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad];
}

type Props = {
  /** Departamentos que se ven a la vez en el tablero -- el filtro de la
   *  barra decide cuáles (ver `EquipoPage.tsx`), no el propio panel. */
  deptos: Team[];
  /** Subconjunto de `deptos` donde la persona es VP. */
  vpDe: Team[];
  /** Board del club: asigna en cualquier departamento, sea VP o no. */
  esBoard: boolean;
};

/**
 * Tablero por estado, con las tareas de todos los `deptos` a la vez.
 *
 * Arrastrar una tarjeta cambia su estado; abrirla y elegir "Estado" en el
 * diálogo hace lo mismo y es la vía accesible por teclado -- el drag es un
 * atajo encima de eso, no lo sustituye. Solo board y VP del departamento de
 * CADA tarea pueden crearla o reasignarla (ver docs/CLAUDE.md); un miembro
 * raso sigue pudiendo mover su propia tarea de estado.
 */
export function TasksPanel({ deptos, vpDe, esBoard }: Props) {
  const directorio = useDirectorio();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [usuario, setUsuario] = useState("");
  const [soloMias, setSoloMias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [abierta, setAbierta] = useState<Task | null>(null);
  const [arrastrando, setArrastrando] = useState<Task | null>(null);
  const [sobreColumna, setSobreColumna] = useState<TaskEstado | null>(null);
  const [ultimoMovimiento, setUltimoMovimiento] = useState<{
    taskId: number;
    departamento: Team;
    titulo: string;
    anterior: TaskEstado;
    actual: TaskEstado;
  } | null>(null);
  const deshacerTimeoutRef = useRef<number | null>(null);

  const [titulo, setTitulo] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("media");
  const [deadline, setDeadline] = useState("");
  const [hora, setHora] = useState("");
  const [responsables, setResponsables] = useState<string[]>([]);
  const [deptoNuevaTarea, setDeptoNuevaTarea] = useState<Team>(deptos[0]);

  function puedeAsignarEn(depto: Team) {
    return esBoard || vpDe.includes(depto);
  }
  const deptosDondePuedeAsignar = deptos.filter(puedeAsignarEn);

  useEffect(() => {
    void cargar();
    return () => {
      if (deshacerTimeoutRef.current) window.clearTimeout(deshacerTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptos.join(",")]);

  useEffect(() => {
    if (!deptos.includes(deptoNuevaTarea)) setDeptoNuevaTarea(deptosDondePuedeAsignar[0] ?? deptos[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptos.join(",")]);

  async function cargar() {
    setIsLoading(true);
    try {
      const respuestas = await Promise.all(deptos.map((d) => apiDepto(d).getTasks()));
      setTasks(respuestas.flatMap((r) => r.tasks));
      setUsuario(respuestas[0]?.usuario ?? "");
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudieron cargar las tareas.");
    } finally {
      setIsLoading(false);
    }
  }

  async function crear(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim() || !instrucciones.trim()) return;

    try {
      await apiDepto(deptoNuevaTarea).createTask({
        titulo,
        instrucciones,
        prioridad,
        deadline: deadline || null,
        hora,
        responsables,
      });
      setTitulo("");
      setInstrucciones("");
      setPrioridad("media");
      setDeadline("");
      setHora("");
      setResponsables([]);
      setMostrarFormulario(false);
      await cargar();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo crear la tarea.");
    }
  }

  function avisarMovimiento(aviso: typeof ultimoMovimiento) {
    setUltimoMovimiento(aviso);
    if (deshacerTimeoutRef.current) window.clearTimeout(deshacerTimeoutRef.current);
    if (aviso) {
      deshacerTimeoutRef.current = window.setTimeout(() => setUltimoMovimiento(null), 6000);
    }
  }

  async function moverA(task: Task, estado: TaskEstado, avisar = true) {
    setSobreColumna(null);
    if (task.estado === estado) return;
    const anterior = task.estado;

    setTasks((actuales) =>
      actuales.map((t) => (t.id === task.id ? { ...t, estado } : t)),
    );
    try {
      await apiDepto(task.departamento as Team).updateTask(task.id, { estado });
      if (avisar) {
        avisarMovimiento({
          taskId: task.id, departamento: task.departamento as Team,
          titulo: task.titulo, anterior, actual: estado,
        });
      }
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo mover la tarea.");
      await cargar();
    }
  }

  function deshacerMovimiento() {
    if (!ultimoMovimiento) return;
    const task = tasks.find((t) => t.id === ultimoMovimiento.taskId);
    avisarMovimiento(null);
    // Sin aviso de nuevo: deshacer no es un movimiento que también se pueda
    // deshacer, o el banner se quedaría reapareciendo indefinidamente.
    if (task) void moverA(task, ultimoMovimiento.anterior, false);
  }

  if (isLoading) return <Esqueleto filas={5} alto={78} />;

  const etiquetasExistentes = [...new Set(tasks.flatMap((t) => t.tags))].sort();
  const variosDeptos = deptos.length > 1;

  const filtroTexto = busqueda.trim().toLowerCase();
  const visibles = tasks
    .filter((t) => !soloMias || t.responsables.includes(usuario))
    .filter((t) => !filtroTexto || t.titulo.toLowerCase().includes(filtroTexto));

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}
      {ultimoMovimiento ? (
        <AlertBanner
          variant="info"
          message={`"${ultimoMovimiento.titulo}" movida a ${TASK_ESTADO_LABEL[ultimoMovimiento.actual]}.`}
          action={{ label: "Deshacer", onClick: deshacerMovimiento }}
        />
      ) : null}

      <header className="crm-barra-react">
        <input
          type="search"
          className="crm-input-react"
          value={busqueda}
          placeholder="Buscar por título..."
          aria-label="Buscar tareas por título"
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <label className={`crm-tag crm-tag-check-react${soloMias ? " crm-tag-azul-react" : ""}`}>
          <input
            type="checkbox"
            className="crm-check"
            checked={soloMias}
            onChange={(event) => setSoloMias(event.target.checked)}
          />
          Solo lo mío
        </label>
        {deptosDondePuedeAsignar.length > 0 ? (
          <button
            type="button"
            className="crm-btn"
            onClick={() => setMostrarFormulario((abierto) => !abierto)}
          >
            {mostrarFormulario ? "Cancelar" : "+ Nueva tarea"}
          </button>
        ) : null}
      </header>

      {mostrarFormulario && deptosDondePuedeAsignar.length > 0 ? (
        <form className="mkt-form-react" onSubmit={crear}>
          {deptosDondePuedeAsignar.length > 1 ? (
            <div className="field-group-react">
              <label htmlFor="tp-depto">Departamento</label>
              <select
                id="tp-depto"
                value={deptoNuevaTarea}
                onChange={(event) => setDeptoNuevaTarea(event.target.value as Team)}
              >
                {deptosDondePuedeAsignar.map((d) => (
                  <option key={d} value={d}>
                    {DEPTO_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field-group-react">
            <label htmlFor="tp-titulo">Título</label>
            <input
              id="tp-titulo"
              type="text"
              value={titulo}
              placeholder="Diseñar cartel de la charla"
              onChange={(event) => setTitulo(event.target.value)}
            />
            <ContadorCaracteres valor={titulo} maximo={MAX_TITULO_LEN} />
          </div>
          <div className="field-group-react">
            <label htmlFor="tp-instrucciones">Instrucciones</label>
            <textarea
              id="tp-instrucciones"
              rows={2}
              required
              value={instrucciones}
              placeholder="Cómo se hace: a quién se escribe, qué plantilla se usa..."
              onChange={(event) => setInstrucciones(event.target.value)}
            />
          </div>
          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="tp-prioridad">Prioridad</label>
              <select
                id="tp-prioridad"
                value={prioridad}
                onChange={(event) => setPrioridad(event.target.value as Prioridad)}
              >
                {PRIORIDADES.map((valor) => (
                  <option key={valor} value={valor}>
                    {PRIORIDAD_LABEL[valor]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group-react">
              <label htmlFor="tp-deadline">Fecha límite</label>
              <input
                id="tp-deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="tp-hora">Hora (opcional)</label>
              <input
                id="tp-hora"
                type="time"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
              />
            </div>
          </div>
          <div className="field-group-react">
            <label htmlFor="tp-responsables">Responsables</label>
            <SelectorMiembros
              id="tp-responsables"
              seleccionados={responsables}
              onCambiar={setResponsables}
            />
          </div>
          <button
            type="submit"
            className="mkt-btn-react"
            disabled={!titulo.trim() || !instrucciones.trim()}
          >
            Crear tarea
          </button>
        </form>
      ) : null}

      {visibles.length === 0 && filtroTexto ? (
        <p className="mkt-vacio-react">
          Ninguna tarea con "{busqueda.trim()}" en el título.
        </p>
      ) : visibles.length === 0 && soloMias ? (
        <p className="mkt-vacio-react">
          No tienes ninguna tarea asignada. Quita el filtro para ver las del resto
          del equipo.
        </p>
      ) : null}

      <div className="mkt-tablero-react">
        {TASK_ESTADOS.map((estado) => {
          const columna = visibles
            .filter((task) => task.estado === estado)
            .sort(compararTareas);

          return (
            <div
              key={estado}
              className={`mkt-columna-react${sobreColumna === estado ? " mkt-columna-sobre-react" : ""}`}
              data-estado={estado}
              onDragOver={(event) => {
                // El tipo MIME viaja siempre, aunque `getData` no se pueda
                // leer hasta soltar: así el `preventDefault` (necesario para
                // que "drop" llegue a disparar) no depende del estado de
                // React, que en un drag real puede no haberse repintado
                // todavía cuando llega el primer "dragover".
                if (!event.dataTransfer.types.includes(TASK_MIME)) return;
                event.preventDefault();
                if (sobreColumna !== estado) setSobreColumna(estado);
              }}
              onDragLeave={() => setSobreColumna((actual) => (actual === estado ? null : actual))}
              onDrop={(event) => {
                event.preventDefault();
                setSobreColumna(null);
                // No basta con "onDragEnd" para limpiar `arrastrando`: al
                // cambiar de columna la tarjeta se desmonta de esta lista y
                // se monta en la de al lado, y el navegador no siempre llega
                // a disparar "dragend" sobre un nodo que ya no está donde
                // empezó el arrastre. Se limpia aquí, que sí se dispara.
                setArrastrando(null);
                const id = Number(event.dataTransfer.getData(TASK_MIME));
                const task = tasks.find((t) => t.id === id);
                if (task) void moverA(task, estado);
              }}
            >
              <h4>
                {TASK_ESTADO_LABEL[estado]}
                <Badge variant="outline" className="mkt-contador-react">
                  {columna.length}
                </Badge>
              </h4>

              {columna.length === 0 ? (
                <p className="mkt-vacio-inline-react">Nada aquí.</p>
              ) : (
                columna.map((task) => {
                  const dias = diasHasta(task.deadline);
                  const vencida = dias !== null && dias < 0 && task.estado !== "acabado";
                  const hechos = task.checklist.filter((i) => i.hecho).length;

                  return (
                    <button
                      key={`${task.departamento}-${task.id}`}
                      type="button"
                      className={`mkt-task-card-react${arrastrando?.id === task.id ? " mkt-task-card-arrastrando-react" : ""}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(TASK_MIME, String(task.id));
                        event.dataTransfer.effectAllowed = "move";
                        setArrastrando(task);
                      }}
                      onDragEnd={() => {
                        setArrastrando(null);
                        setSobreColumna(null);
                      }}
                      onClick={() => setAbierta(task)}
                    >
                      {variosDeptos ? (
                        <span className="mkt-etiquetas-react">
                          <span className={`crm-tag ${DEPTO_TAG[task.departamento] ?? ""}`}>
                            {DEPTO_LABEL[task.departamento as Team]}
                          </span>
                        </span>
                      ) : null}

                      {task.tags.length > 0 ? (
                        <span className="mkt-etiquetas-react">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </span>
                      ) : null}

                      {task.content_titulo || task.campaign_nombre ? (
                        <span className="mkt-task-padre-react">
                          {task.content_titulo ?? task.campaign_nombre}
                        </span>
                      ) : null}

                      <span className="mkt-task-titulo-react">{task.titulo}</span>

                      <span className="mkt-task-pie-react">
                        <span className="mkt-task-senales-react">
                          {task.prioridad !== "media" ? (
                            <span
                              className={`crm-tag${task.prioridad === "alta" ? " crm-tag-ambar-react" : ""}`}
                            >
                              {PRIORIDAD_LABEL[task.prioridad]}
                            </span>
                          ) : null}
                          {task.deadline ? (
                            <span
                              className={`mkt-fecha-react${vencida ? " mkt-vencida-react" : ""}`}
                            >
                              {formatearFecha(task.deadline)}
                            </span>
                          ) : null}
                          {task.checklist.length > 0 ? (
                            <span className="mkt-fecha-react">
                              {hechos}/{task.checklist.length}
                            </span>
                          ) : null}
                        </span>

                        <AvataresDeResponsables
                          responsables={task.responsables}
                          directorio={directorio}
                          maximo={3}
                        />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {abierta ? (
        <DeptoProvider value={abierta.departamento as Team}>
          <TaskDialog
            task={abierta}
            etiquetasExistentes={etiquetasExistentes}
            puedeAsignar={puedeAsignarEn(abierta.departamento as Team)}
            onCerrar={() => setAbierta(null)}
            onGuardado={() => {
              setAbierta(null);
              void cargar();
            }}
          />
        </DeptoProvider>
      ) : null}
    </section>
  );
}
