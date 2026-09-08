import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { ContadorCaracteres } from "../../feedback/ContadorCaracteres";
import { AdjuntosDeContent } from "./AdjuntosDeContent";
import { AvataresDeResponsables } from "./Avatares";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiFailure } from "../../../types/api";
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
  type TaskEstado,
} from "../../../types/marketing";

type Props = {
  task: Task;
  onCerrar: () => void;
  onGuardado: () => void;
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
export function TaskDialog({ task, onCerrar, onGuardado }: Props) {
  const { deleteTask, updateTask } = useApi();

  const [titulo, setTitulo] = useState(task.titulo);
  const [descripcion, setDescripcion] = useState(task.descripcion);
  const [estado, setEstado] = useState<TaskEstado>(task.estado);
  const [prioridad, setPrioridad] = useState<Prioridad>(task.prioridad);
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const [responsables, setResponsables] = useState(comoLineas(task.responsables));
  const [tags, setTags] = useState(task.tags.join(", "));
  const [enlaces, setEnlaces] = useState(comoLineas(task.enlaces));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist);
  const [nuevoItem, setNuevoItem] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsSaving(true);
    setError(null);

    try {
      await updateTask(task.id, {
        titulo,
        descripcion,
        estado,
        prioridad,
        deadline: deadline || null,
        responsables: desdeLineas(responsables),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        enlaces: desdeLineas(enlaces),
        checklist,
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
        </DialogHeader>

        {error ? <AlertBanner variant="error" message={error} /> : null}

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

          <div className="field-group-react">
            <label htmlFor="td-deadline">Fecha límite</label>
            <input
              id="td-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
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
            <label htmlFor="td-responsables">Responsables (uno por línea)</label>
            {desdeLineas(responsables).length > 0 ? (
              <AvataresDeResponsables
                responsables={desdeLineas(responsables)}
                className="mkt-avatares-dialogo-react"
              />
            ) : null}
            <textarea
              id="td-responsables"
              rows={2}
              value={responsables}
              placeholder="abril@telecoemprende.es"
              onChange={(event) => setResponsables(event.target.value)}
            />
          </div>

          <div className="field-group-react">
            <label htmlFor="td-tags">Etiquetas (separadas por comas)</label>
            <input
              id="td-tags"
              type="text"
              value={tags}
              placeholder="urgente, diseño"
              onChange={(event) => setTags(event.target.value)}
            />
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
      </DialogContent>
    </Dialog>
  );
}
