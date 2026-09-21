import { motion } from "motion/react";
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
import { Contador, useEntradaDeFila } from "../../movimiento";
import type { ApiFailure } from "../../../types/api";
import { DEPTO_LABEL, TEAMS, type Team } from "../../../types/equipo";
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
  /** Todos los departamentos de la persona, aunque no estén en el filtro de
   *  vista -- de aquí sale a qué departamentos puede dar de alta una tarea
   *  nueva (ver `deptosNuevaTarea` más abajo), igual que ya hace el
   *  calendario (`CalendarPanel`): ver el tablero de uno y crear en otro son
   *  cosas distintas. */
  teams: Team[];
  /** Subconjunto de `teams` donde la persona es VP. */
  vpDe: Team[];
  /** Asigna en cualquier departamento, sea VP o no. Es board del club O está
   *  en ingeniería: los dos reciben sesión de /admin al entrar (ver
   *  `login_equipo`), y el backend deja asignar a cualquiera que la tenga
   *  (`_puede_asignar_tareas`). Mirar solo el cargo dejaba a ingeniería con
   *  permisos de servidor que la interfaz le escondía. */
  puedeAsignarEnTodo: boolean;
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
export function TasksPanel({ deptos, teams, vpDe, puedeAsignarEnTodo }: Props) {
  const directorio = useDirectorio();
  const entradaTarjeta = useEntradaDeFila();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [usuario, setUsuario] = useState("");
  const [soloMias, setSoloMias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // El historial es de solo lectura y se pide aparte: las acabadas hace más
  // de un día ya no vienen en `tasks` (ver `listar_tasks` en el backend), así
  // que "Completadas" es una vista distinta, no un filtro sobre esta lista.
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [archivadas, setArchivadas] = useState<Task[]>([]);
  const [cargandoArchivadas, setCargandoArchivadas] = useState(false);
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
  function puedeAsignarEn(depto: Team) {
    return puedeAsignarEnTodo || vpDe.includes(depto);
  }
  // De dónde sale a qué departamentos se puede dar de alta una tarea: todo el
  // club si asigna en todo (esté o no dado de alta ahí), o los suyos propios
  // si no -- nunca solo `deptos` (el filtro de qué se está VIENDO ahora
  // mismo), igual que ya hace el calendario (`CalendarPanel`).
  const deptosDondePuedeAsignar = (puedeAsignarEnTodo ? TEAMS : teams).filter(puedeAsignarEn);
  // Varios a la vez: una misma tarea que toca a dos departamentos se da de
  // alta una vez en cada uno (no hay tarea compartida, cada tablero tiene la
  // suya y la mueve de estado por su cuenta).
  const [deptosNuevaTarea, setDeptosNuevaTarea] = useState<Team[]>(
    [deptosDondePuedeAsignar[0] ?? deptos[0]].filter(Boolean),
  );

  useEffect(() => {
    void cargar();
    return () => {
      if (deshacerTimeoutRef.current) window.clearTimeout(deshacerTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptos.join(",")]);

  useEffect(() => {
    setDeptosNuevaTarea((actuales) => {
      const validos = actuales.filter((d) => deptosDondePuedeAsignar.includes(d));
      if (validos.length === actuales.length) return actuales;
      return validos.length > 0
        ? validos
        : [deptosDondePuedeAsignar[0] ?? deptos[0]].filter(Boolean);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptosDondePuedeAsignar.join(",")]);

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

  async function cargarArchivadas() {
    setCargandoArchivadas(true);
    try {
      const respuestas = await Promise.all(deptos.map((d) => apiDepto(d).getTasksArchivadas()));
      setArchivadas(respuestas.flatMap((r) => r.tasks));
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo cargar el historial.");
    } finally {
      setCargandoArchivadas(false);
    }
  }

  function alternarArchivadas() {
    const abrir = !verArchivadas;
    setVerArchivadas(abrir);
    if (abrir) void cargarArchivadas();
  }

  async function crear(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim() || !instrucciones.trim() || deptosNuevaTarea.length === 0) return;

    try {
      await Promise.all(
        deptosNuevaTarea.map((d) =>
          apiDepto(d).createTask({
            titulo,
            instrucciones,
            prioridad,
            deadline: deadline || null,
            hora,
            responsables,
          }),
        ),
      );
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
  const archivadasVisibles = archivadas
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
        <button
          type="button"
          className={`crm-tag${verArchivadas ? " crm-tag-azul-react" : ""}`}
          aria-pressed={verArchivadas}
          onClick={alternarArchivadas}
        >
          Completadas
        </button>
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
            <div className="mkt-form-deptos-react">
              <span>Departamentos</span>
              <div className="mkt-etiquetas-react">
                {deptosDondePuedeAsignar.map((d) => {
                  const elegido = deptosNuevaTarea.includes(d);
                  return (
                    <label
                      key={d}
                      className={`crm-tag crm-tag-check-react${elegido ? " crm-tag-azul-react" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="crm-check"
                        checked={elegido}
                        // El filtro de la barra tiene una casilla con el
                        // mismo texto: sin esto, "Marketing" a secas no dice
                        // si se está filtrando la vista o eligiendo destino.
                        aria-label={`Crear en ${DEPTO_LABEL[d]}`}
                        onChange={() =>
                          setDeptosNuevaTarea((actuales) =>
                            elegido
                              ? actuales.filter((otro) => otro !== d)
                              : [...actuales, d],
                          )
                        }
                      />
                      {DEPTO_LABEL[d]}
                    </label>
                  );
                })}
              </div>
              {deptosNuevaTarea.length > 1 ? (
                <p className="mkt-meta-react">
                  Se creará una copia en cada tablero, independiente del resto.
                </p>
              ) : null}
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
              deptos={deptosNuevaTarea}
            />
          </div>
          <button
            type="submit"
            className="mkt-btn-react"
            disabled={
              !titulo.trim() || !instrucciones.trim() || deptosNuevaTarea.length === 0
            }
          >
            Crear tarea
          </button>
        </form>
      ) : null}

      {verArchivadas ? (
        cargandoArchivadas ? (
          <Esqueleto filas={4} alto={78} />
        ) : archivadasVisibles.length === 0 ? (
          <p className="mkt-vacio-react">
            {filtroTexto
              ? `Ninguna completada con "${busqueda.trim()}" en el título.`
              : "Nada archivado todavía: aparecen aquí las tareas acabadas hace más de un día."}
          </p>
        ) : (
          <div className="mkt-archivadas-lista-react">
            {archivadasVisibles.map((task, indice) => (
              // Envuelta por lo mismo que la del tablero: `.mkt-task-card-react`
              // tiene `transform` en su `:hover`, y si motion le escribe un
              // `transform` inline a la propia tarjeta ese hover deja de verse
              // para siempre. Anima el envoltorio, la tarjeta se queda quieta.
              <motion.div key={`${task.departamento}-${task.id}`} {...entradaTarjeta(indice)}>
                <button
                  type="button"
                  className="mkt-task-card-react"
                  onClick={() => setAbierta(task)}
                >
                  {variosDeptos ? (
                    <span className="mkt-etiquetas-react">
                      <span className={`crm-tag ${DEPTO_TAG[task.departamento] ?? ""}`}>
                        {DEPTO_LABEL[task.departamento as Team]}
                      </span>
                    </span>
                  ) : null}

                  {task.content_titulo || task.campaign_nombre ? (
                    <span className="mkt-task-padre-react">
                      {task.content_titulo ?? task.campaign_nombre}
                    </span>
                  ) : null}

                  <span className="mkt-task-titulo-react">{task.titulo}</span>

                  <span className="mkt-task-pie-react">
                    <span className="crm-s">
                      Acabada el {formatearFecha(task.completado_en?.slice(0, 10) ?? null, true)}
                    </span>
                    <AvataresDeResponsables
                      responsables={task.responsables}
                      directorio={directorio}
                      maximo={3}
                    />
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        <>
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
                  <Contador valor={columna.length} />
                </Badge>
              </h4>

              {columna.length === 0 ? (
                <p className="mkt-vacio-inline-react">Nada aquí.</p>
              ) : (
                columna.map((task, indice) => {
                  const dias = diasHasta(task.deadline);
                  const vencida = dias !== null && dias < 0 && task.estado !== "acabado";
                  const hechos = task.checklist.filter((i) => i.hecho).length;

                  return (
                    // El envoltorio existe porque `motion.button` se queda con
                    // `onDragStart`/`onDragEnd` para su propio sistema de
                    // arrastre y nunca llegan al DOM: el tablero usa el drag
                    // nativo del navegador, así que anima el envoltorio y la
                    // tarjeta se queda siendo un <button> normal.
                    <motion.div key={`${task.departamento}-${task.id}`} {...entradaTarjeta(indice)}>
                      <button
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
                    </motion.div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
        </>
      )}

      {abierta ? (
        <DeptoProvider value={abierta.departamento as Team}>
          <TaskDialog
            task={abierta}
            etiquetasExistentes={etiquetasExistentes}
            puedeAsignar={puedeAsignarEn(abierta.departamento as Team)}
            deptosDisponibles={deptosDondePuedeAsignar}
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
