import { FormEvent, useEffect, useState } from "react";

import { createTask, getTasks } from "../../../api/marketing";
import { AvataresDeResponsables } from "./Avatares";
import { TaskDialog } from "./TaskDialog";
import { AlertBanner } from "../../feedback/AlertBanner";
import type { ApiFailure } from "../../../types/api";
import {
  PRIORIDADES,
  PRIORIDAD_LABEL,
  TASK_ESTADOS,
  TASK_ESTADO_LABEL,
  diasHasta,
  formatearFecha,
  type Prioridad,
  type Task,
} from "../../../types/marketing";

/**
 * Tablero por estado. Se mueve con un <select>, no arrastrando: drag & drop
 * exige teclado alternativo para ser accesible y aquí no aporta nada que el
 * desplegable no haga ya.
 */
export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usuario, setUsuario] = useState("");
  const [soloMias, setSoloMias] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [abierta, setAbierta] = useState<Task | null>(null);

  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("media");
  const [deadline, setDeadline] = useState("");
  const [responsables, setResponsables] = useState("");

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar() {
    setIsLoading(true);
    try {
      const respuesta = await getTasks();
      setTasks(respuesta.tasks);
      setUsuario(respuesta.usuario);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudieron cargar las tareas.");
    } finally {
      setIsLoading(false);
    }
  }

  async function crear(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim()) return;

    try {
      await createTask({
        titulo,
        prioridad,
        deadline: deadline || null,
        responsables: responsables
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      });
      setTitulo("");
      setPrioridad("media");
      setDeadline("");
      setResponsables("");
      setMostrarFormulario(false);
      await cargar();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo crear la tarea.");
    }
  }

  if (isLoading) return <p className="mkt-cargando-react">Cargando tareas...</p>;

  const visibles = soloMias
    ? tasks.filter((t) => t.responsables.includes(usuario))
    : tasks;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="mkt-panel-header-react">
        <label className="mkt-toggle-react">
          <input
            type="checkbox"
            checked={soloMias}
            onChange={(event) => setSoloMias(event.target.checked)}
          />
          Solo lo mío
        </label>
        <button
          type="button"
          className="mkt-btn-react"
          onClick={() => setMostrarFormulario((abierto) => !abierto)}
        >
          {mostrarFormulario ? "Cancelar" : "+ Nueva tarea"}
        </button>
      </header>

      {mostrarFormulario ? (
        <form className="mkt-form-react" onSubmit={crear}>
          <div className="field-group-react">
            <label htmlFor="tp-titulo">Título</label>
            <input
              id="tp-titulo"
              type="text"
              value={titulo}
              placeholder="Diseñar cartel de la charla"
              onChange={(event) => setTitulo(event.target.value)}
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
          </div>
          <div className="field-group-react">
            <label htmlFor="tp-responsables">Responsables (separados por comas)</label>
            <input
              id="tp-responsables"
              type="text"
              value={responsables}
              placeholder="abril@alumnos.upm.es, hugo@alumnos.upm.es"
              onChange={(event) => setResponsables(event.target.value)}
            />
          </div>
          <button type="submit" className="mkt-btn-react" disabled={!titulo.trim()}>
            Crear tarea
          </button>
        </form>
      ) : null}

      {visibles.length === 0 && soloMias ? (
        <p className="mkt-vacio-react">
          No tienes ninguna tarea asignada. Quita el filtro para ver las del resto
          del equipo.
        </p>
      ) : null}

      <div className="mkt-tablero-react">
        {TASK_ESTADOS.map((estado) => {
          const columna = visibles.filter((task) => task.estado === estado);

          return (
            <div key={estado} className="mkt-columna-react" data-estado={estado}>
              <h4>
                {TASK_ESTADO_LABEL[estado]}
                <span className="mkt-contador-react">{columna.length}</span>
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
                      key={task.id}
                      type="button"
                      className="mkt-task-card-react"
                      onClick={() => setAbierta(task)}
                    >
                      {task.tags.length > 0 ? (
                        <span className="mkt-etiquetas-react">
                          {task.tags.map((tag) => (
                            <span key={tag} className="mkt-etiqueta-react">
                              {tag}
                            </span>
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
                              className={`mkt-chip-react mkt-chip-prioridad-${task.prioridad}-react`}
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

                        <AvataresDeResponsables responsables={task.responsables} maximo={3} />
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
        <TaskDialog
          task={abierta}
          onCerrar={() => setAbierta(null)}
          onGuardado={() => {
            setAbierta(null);
            void cargar();
          }}
        />
      ) : null}
    </section>
  );
}
