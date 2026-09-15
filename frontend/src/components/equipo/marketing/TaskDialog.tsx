import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useApi, useDirectorio } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { ContadorCaracteres } from "../../feedback/ContadorCaracteres";
import { AdjuntosDeContent } from "./AdjuntosDeContent";
import { Esqueleto } from "../../feedback/Esqueleto";
import { SelectorMiembros } from "./SelectorMiembros";
import { etiquetaDe } from "./Avatares";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiFailure } from "../../../types/api";
import { DEPTO_LABEL, type Team } from "../../../types/equipo";
import {
  MAX_TEXTO_LARGO_LEN,
  MAX_TITULO_LEN,
  PRIORIDADES,
  PRIORIDAD_LABEL,
  TASK_ESTADOS,
  TASK_ESTADO_LABEL,
  type ChecklistItem,
  type Prioridad,
  type Task,
  type TaskComment,
  type TaskEstado,
} from "../../../types/marketing";

type Props = {
  task: Task;
  onCerrar: () => void;
  onGuardado: () => void;
  /** Para el autocompletado del campo de etiquetas -- las que ya se usan en
   *  el departamento, no una lista fija (ver `TasksPanel`/`WeekPanel`). */
  etiquetasExistentes?: string[];
  /** Solo board y VPs reasignan (ver docs/CLAUDE.md) -- si es `false`, el
   *  selector de responsables se enseña de solo lectura. */
  puedeAsignar?: boolean;
  /** Departamentos a los que se puede mudar la tarea: los mismos donde la
   *  persona puede darla de alta (ver `TasksPanel`). Con menos de dos no se
   *  enseña el selector, que no habría nada que elegir. */
  deptosDisponibles?: Team[];
  /** Saltar al proyecto del que cuelga. Lo pasa quien tenga a dónde saltar
   *  -- el calendario, que antes ofrecía ese salto desde su ficha de resumen
   *  y lo habría perdido al abrir este diálogo en su lugar. Sin esta prop no
   *  se enseña el botón: desde el tablero de Tareas ya se está en el sitio. */
  onAbrirCampaign?: (campaignId: number, departamento: Team) => void;
  /** La tarea todavía se está pidiendo entera y `task` es solo el resumen que
   *  tenía quien abrió el diálogo. Se enseña la cabecera con lo que ya se
   *  sabe y un esqueleto en lugar del formulario -- abrir al instante y
   *  rellenar es mejor que dejar el clic sin respuesta mientras va la red
   *  (ver `abrir()` en `CalendarPanel`). */
  cargando?: boolean;
};

function comoLineas(valores: string[]) {
  return valores.join("\n");
}

function desdeLineas(texto: string) {
  return texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

/**
 * La tarea abierta a tamaño completo.
 *
 * Hasta ahora una tarea solo se podía mover de estado o borrar: descripción,
 * checklist, tags y enlaces se guardaban en base de datos pero no había forma
 * de tocarlos desde la interfaz. Aquí es donde se editan.
 */
export function TaskDialog({
  task, onCerrar, onGuardado, etiquetasExistentes = [], puedeAsignar = true,
  deptosDisponibles = [], onAbrirCampaign, cargando = false,
}: Props) {
  const { deleteTask, getTaskComments, createTaskComment, updateTask } = useApi();
  const directorio = useDirectorio();

  const [titulo, setTitulo] = useState(task.titulo);
  const [descripcion, setDescripcion] = useState(task.descripcion);
  const [instrucciones, setInstrucciones] = useState(task.instrucciones);
  const [estado, setEstado] = useState<TaskEstado>(task.estado);
  const [departamento, setDepartamento] = useState<Team>(task.departamento as Team);
  const [prioridad, setPrioridad] = useState<Prioridad>(task.prioridad);
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const [hora, setHora] = useState(task.hora);
  const [responsables, setResponsables] = useState<string[]>(task.responsables);
  const [tags, setTags] = useState(task.tags.join(", "));
  const [enlaces, setEnlaces] = useState(comoLineas(task.enlaces));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist);
  const [nuevoItem, setNuevoItem] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comentarios, setComentarios] = useState<TaskComment[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  useEffect(() => {
    if (cargando) return;
    let activo = true;
    void getTaskComments(task.id)
      .then((r) => activo && setComentarios(r.comments))
      .catch(() => {
        // Sin comentarios cargados, la sección se queda vacía en vez de rota.
      });
    return () => {
      activo = false;
    };
  }, [task.id, getTaskComments, cargando]);

  async function enviarComentario(event: FormEvent) {
    event.preventDefault();
    const texto = nuevoComentario.trim();
    if (!texto) return;

    setEnviandoComentario(true);
    try {
      const respuesta = await createTaskComment(task.id, texto);
      setComentarios((actuales) => [...actuales, respuesta.comment]);
      setNuevoComentario("");
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo enviar el comentario.");
    } finally {
      setEnviandoComentario(false);
    }
  }

  const hechos = checklist.filter((i) => i.hecho).length;

  function anadirItem(event: FormEvent) {
    event.preventDefault();
    const texto = nuevoItem.trim();
    if (!texto) return;
    setChecklist((actual) => [...actual, { texto, hecho: false }]);
    setNuevoItem("");
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!instrucciones.trim()) {
      setError("Las instrucciones son obligatorias.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateTask(task.id, {
        titulo,
        descripcion,
        instrucciones,
        estado,
        prioridad,
        deadline: deadline || null,
        hora,
        responsables,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        enlaces: desdeLineas(enlaces),
        checklist,
        ...(departamento !== task.departamento ? { departamento } : {}),
      });
      onGuardado();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo guardar la tarea.");
      setIsSaving(false);
    }
  }

  async function borrar() {
    try {
      await deleteTask(task.id);
      onGuardado();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo eliminar la tarea.");
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="mkt-dialogo-react">
        <DialogHeader>
          <DialogTitle>{task.titulo}</DialogTitle>
          <DialogDescription>
            {task.content_titulo ?? task.campaign_nombre ?? "Tarea suelta"}
          </DialogDescription>
          {onAbrirCampaign && task.campaign_id !== null ? (
            <button
              type="button"
              className="mkt-btn-mini-react mkt-dialogo-ir-react"
              onClick={() =>
                onAbrirCampaign(task.campaign_id as number, task.departamento as Team)
              }
            >
              Ver campaña →
            </button>
          ) : null}
        </DialogHeader>

        {error ? <AlertBanner variant="error" message={error} /> : null}

        {cargando ? (
          <Esqueleto filas={4} alto={56} />
        ) : (
        <form className="mkt-form-react mkt-form-dialogo-react" onSubmit={guardar}>
          <div className="field-group-react">
            <label htmlFor="td-titulo">Título</label>
            <input
              id="td-titulo"
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
            />
            <ContadorCaracteres valor={titulo} maximo={MAX_TITULO_LEN} />
          </div>

          <div className="field-group-react">
            <label htmlFor="td-descripcion">Descripción</label>
            <textarea
              id="td-descripcion"
              rows={3}
              value={descripcion}
              placeholder="Qué hay que hacer exactamente..."
              onChange={(event) => setDescripcion(event.target.value)}
            />
            <ContadorCaracteres valor={descripcion} maximo={MAX_TEXTO_LARGO_LEN} />
          </div>

          <div className="field-group-react">
            <label htmlFor="td-instrucciones">Instrucciones</label>
            <textarea
              id="td-instrucciones"
              rows={3}
              required
              value={instrucciones}
              placeholder="Cómo se hace: a quién se escribe, qué plantilla se usa..."
              onChange={(event) => setInstrucciones(event.target.value)}
            />
            <ContadorCaracteres valor={instrucciones} maximo={MAX_TEXTO_LARGO_LEN} />
          </div>

          {puedeAsignar && deptosDisponibles.length > 1 ? (
            <div className="field-group-react">
              <label htmlFor="td-depto">Departamento</label>
              <select
                id="td-depto"
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value as Team)}
              >
                {deptosDisponibles.map((d) => (
                  <option key={d} value={d}>
                    {DEPTO_LABEL[d]}
                  </option>
                ))}
              </select>
              {departamento !== task.departamento ? (
                <p className="mkt-meta-react">
                  Al guardar deja de colgar de su campaña o contenido: son de{" "}
                  {DEPTO_LABEL[task.departamento as Team]}.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="td-estado">Estado</label>
              <select
                id="td-estado"
                value={estado}
                onChange={(event) => setEstado(event.target.value as TaskEstado)}
              >
                {TASK_ESTADOS.map((valor) => (
                  <option key={valor} value={valor}>
                    {TASK_ESTADO_LABEL[valor]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group-react">
              <label htmlFor="td-prioridad">Prioridad</label>
              <select
                id="td-prioridad"
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
          </div>

          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="td-deadline">Fecha límite</label>
              <input
                id="td-deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="td-hora">Hora (opcional)</label>
              <input
                id="td-hora"
                type="time"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
              />
            </div>
          </div>

          {/* ---- Checklist ---- */}
          <div className="mkt-checklist-react">
            <p className="mkt-adjuntos-titulo-react">
              Checklist{checklist.length > 0 ? ` · ${hechos}/${checklist.length}` : ""}
            </p>

            {checklist.map((item, indice) => (
              <div key={`${item.texto}-${indice}`} className="mkt-checklist-fila-react">
                <label>
                  <input
                    type="checkbox"
                    checked={item.hecho}
                    onChange={() =>
                      setChecklist((actual) =>
                        actual.map((i, n) =>
                          n === indice ? { ...i, hecho: !i.hecho } : i,
                        ),
                      )
                    }
                  />
                  <span className={item.hecho ? "mkt-tachado-react" : ""}>
                    {item.texto}
                  </span>
                </label>
                <button
                  type="button"
                  className="mkt-btn-borrar-react"
                  aria-label={`Quitar ${item.texto}`}
                  onClick={() =>
                    setChecklist((actual) => actual.filter((_, n) => n !== indice))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {/* Los subpasos se añaden con su propio submit; anidar <form> no es
                válido, así que este va fuera del formulario principal por
                `form=""` implícito: se maneja con onKeyDown. */}
            <div className="mkt-tarea-nueva-react">
              <input
                type="text"
                value={nuevoItem}
                placeholder="Añadir paso..."
                aria-label="Nuevo paso de la checklist"
                onChange={(event) => setNuevoItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    anadirItem(event);
                  }
                }}
              />
              <button
                type="button"
                className="mkt-btn-mini-react"
                aria-label="Añadir paso"
                disabled={!nuevoItem.trim()}
                onClick={anadirItem}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div className="field-group-react">
            <label htmlFor="td-responsables">Responsables</label>
            {puedeAsignar ? (
              <SelectorMiembros
                id="td-responsables"
                seleccionados={responsables}
                onCambiar={setResponsables}
                deptos={[departamento]}
              />
            ) : (
              <p className="mkt-meta-react">
                {responsables.length > 0
                  ? responsables.map((email) => etiquetaDe(email, directorio[email])).join(", ")
                  : "Sin asignar"}
                {" · solo board y VPs reasignan"}
              </p>
            )}
          </div>

          <div className="field-group-react">
            <label htmlFor="td-tags">Etiquetas (separadas por comas)</label>
            <input
              id="td-tags"
              type="text"
              list="td-tags-list"
              value={tags}
              placeholder="urgente, diseño"
              onChange={(event) => setTags(event.target.value)}
            />
            {etiquetasExistentes.length > 0 ? (
              <datalist id="td-tags-list">
                {etiquetasExistentes.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            ) : null}
          </div>

          <div className="field-group-react">
            <label htmlFor="td-enlaces">Enlaces (uno por línea)</label>
            <textarea
              id="td-enlaces"
              rows={2}
              value={enlaces}
              placeholder="https://drive.google.com/..."
              onChange={(event) => setEnlaces(event.target.value)}
            />
          </div>

          <AdjuntosDeContent enlaces={desdeLineas(enlaces)} />

          <div className="mkt-checklist-react">
            <p className="mkt-adjuntos-titulo-react">
              Comentarios{comentarios.length > 0 ? ` · ${comentarios.length}` : ""}
            </p>

            {comentarios.length === 0 ? (
              <p className="mkt-vacio-inline-react">Sin comentarios todavía.</p>
            ) : (
              <ul className="mkt-comentarios-react">
                {comentarios.map((c) => (
                  <li key={c.id} className="mkt-comentario-react">
                    <span className="mkt-comentario-cabecera-react">
                      <b>{etiquetaDe(c.autor, directorio[c.autor])}</b>
                      <span className="mkt-meta-react">{c.created_at.slice(0, 16).replace("T", " ")}</span>
                    </span>
                    <p className="mkt-comentario-texto-react">{c.texto}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mkt-tarea-nueva-react">
              <input
                type="text"
                value={nuevoComentario}
                placeholder="Escribe un comentario..."
                aria-label="Nuevo comentario"
                onChange={(event) => setNuevoComentario(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") enviarComentario(event);
                }}
              />
              <button
                type="button"
                className="mkt-btn-mini-react"
                aria-label="Añadir comentario"
                disabled={!nuevoComentario.trim() || enviandoComentario}
                onClick={enviarComentario}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div className="mkt-modal-acciones-react">
            <button type="submit" className="mkt-btn-react" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="mkt-btn-mini-react" onClick={onCerrar}>
              Cancelar
            </button>

            {confirmando ? (
              <span className="mkt-confirmar-react">
                ¿Eliminar la tarea?
                <button
                  type="button"
                  className="mkt-btn-mini-peligro-react"
                  onClick={() => void borrar()}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className="mkt-btn-mini-react"
                  onClick={() => setConfirmando(false)}
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="mkt-btn-borrar-react mkt-borrar-derecha-react"
                onClick={() => setConfirmando(true)}
              >
                Eliminar tarea
              </button>
            )}
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
