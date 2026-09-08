import { FormEvent, useCallback, useEffect, useState } from "react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { AdjuntosDeContent } from "./AdjuntosDeContent";
import { ContentEditor } from "./ContentEditor";
import { Badge } from "@/components/ui/badge";
import type { ApiFailure } from "../../../types/api";
import {
  CONTENT_ESTADOS,
  CONTENT_ESTADO_LABEL,
  TASK_ESTADO_LABEL,
  formatearFecha,
  type CampaignDetalle,
  type CampaignResumen,
  type Content,
  type ContentEstado,
  type Task,
} from "../../../types/marketing";

function mensajeDeError(error: unknown, porDefecto: string) {
  const fallo = error as ApiFailure;
  return fallo?.message || porDefecto;
}

/** Barra de progreso de una campaña: cuántas de sus tareas están acabadas. */
function ProgresoCampaign({ tareas }: { tareas: Task[] }) {
  if (tareas.length === 0) return null;

  const acabadas = tareas.filter((t) => t.estado === "acabado").length;
  const porcentaje = Math.round((acabadas / tareas.length) * 100);

  return (
    <div className="mkt-progreso-react">
      <div className="mkt-progreso-barra-react" aria-hidden="true">
        <span style={{ transform: `scaleX(${porcentaje / 100})` }} />
      </div>
      <span className="mkt-progreso-texto-react">
        {acabadas === tareas.length
          ? `Todo listo · ${tareas.length} tareas`
          : `${acabadas} de ${tareas.length} tareas`}
      </span>
    </div>
  );
}

/** Tareas de un contenido, con su casilla para marcar acabado sin abrir nada. */
function TareasDeContent({
  tasks,
  onToggle,
  onAñadir,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onAñadir: (titulo: string) => void;
}) {
  const [nueva, setNueva] = useState("");

  function enviar(event: FormEvent) {
    event.preventDefault();
    const titulo = nueva.trim();
    if (!titulo) return;
    onAñadir(titulo);
    setNueva("");
  }

  return (
    <div className="mkt-tareas-react">
      {tasks.length === 0 ? (
        <p className="mkt-vacio-inline-react">Sin tareas todavía.</p>
      ) : (
        <ul className="mkt-tareas-lista-react">
          {tasks.map((task) => (
            <li key={task.id}>
              <label>
                <input
                  type="checkbox"
                  checked={task.estado === "acabado"}
                  // Una tarea "en progreso" no está ni sin empezar ni hecha.
                  // Sin el estado indeterminado, la casilla la pintaba vacía y
                  // parecía que nadie la había tocado.
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        task.estado === "en_progreso" || task.estado === "por_revisar";
                    }
                  }}
                  onChange={() => onToggle(task)}
                />
                <span className={task.estado === "acabado" ? "mkt-tachado-react" : ""}>
                  {task.titulo}
                </span>
              </label>
              <Badge variant="outline" className={`mkt-chip-${task.estado}-react`}>
                {TASK_ESTADO_LABEL[task.estado]}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <form className="mkt-tarea-nueva-react" onSubmit={enviar}>
        <input
          type="text"
          value={nueva}
          placeholder="Añadir tarea (guion, grabar, editar...)"
          onChange={(event) => setNueva(event.target.value)}
        />
        <button type="submit" className="mkt-btn-mini-react" disabled={!nueva.trim()}>
          Añadir
        </button>
      </form>
    </div>
  );
}

/** Pegar el enlace del diseño o del vídeo sin tener que abrir el editor. */
function EnlaceNuevo({ onAñadir }: { onAñadir: (enlace: string) => void }) {
  const [valor, setValor] = useState("");

  function enviar(event: FormEvent) {
    event.preventDefault();
    const enlace = valor.trim();
    if (!enlace) return;
    onAñadir(enlace);
    setValor("");
  }

  return (
    <form className="mkt-tarea-nueva-react mkt-enlace-nuevo-react" onSubmit={enviar}>
      <input
        type="url"
        value={valor}
        placeholder="Pegar enlace del diseño, vídeo o carpeta..."
        aria-label="Nuevo enlace del contenido"
        onChange={(event) => setValor(event.target.value)}
      />
      <button type="submit" className="mkt-btn-mini-react" disabled={!valor.trim()}>
        Adjuntar
      </button>
    </form>
  );
}

type Props = {
  /** Campaña que hay que abrir directamente (viene del calendario). */
  campaignInicial: number | null;
  onCampaignAbierta: () => void;
};

export function CampaignsPanel({ campaignInicial, onCampaignAbierta }: Props) {
  const {
    createCampaign,
    createContent,
    createTask,
    deleteCampaign,
    deleteContent,
    getCampaign,
    getCampaigns,
    updateCampaign,
    updateContent,
    updateTask,
  } = useApi();

  const [campaigns, setCampaigns] = useState<CampaignResumen[]>([]);
  const [detalle, setDetalle] = useState<CampaignDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editando, setEditando] = useState<Content | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoCampaign, setEditandoCampaign] = useState(false);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [confirmandoContent, setConfirmandoContent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [audiencia, setAudiencia] = useState("");
  const [fecha, setFecha] = useState("");

  const abrir = useCallback(async (id: number) => {
    try {
      const respuesta = await getCampaign(id);
      setDetalle(respuesta.campaign);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo abrir la campaña."));
    }
  }, []);

  const cargarCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const respuesta = await getCampaigns();
      setCampaigns(respuesta.campaigns);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudieron cargar las campañas."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarCampaigns();
  }, [cargarCampaigns]);

  useEffect(() => {
    if (campaignInicial !== null) {
      void abrir(campaignInicial);
      onCampaignAbierta();
    }
  }, [campaignInicial, abrir, onCampaignAbierta]);

  async function recargarDetalle() {
    if (detalle) await abrir(detalle.id);
  }

  async function enviarNueva(event: FormEvent) {
    event.preventDefault();
    if (!nombre.trim()) return;

    try {
      await createCampaign({ nombre, objetivo, audiencia, fecha: fecha || null });
      setNombre("");
      setObjetivo("");
      setAudiencia("");
      setFecha("");
      setMostrarFormulario(false);
      await cargarCampaigns();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la campaña."));
    }
  }

  async function guardarCampaign(event: FormEvent) {
    event.preventDefault();
    if (!detalle || !nombre.trim()) return;

    try {
      await updateCampaign(detalle.id, {
        nombre,
        objetivo,
        audiencia,
        fecha: fecha || null,
      });
      setEditandoCampaign(false);
      await abrir(detalle.id);
      await cargarCampaigns();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar la campaña."));
    }
  }

  function empezarAEditarCampaign() {
    if (!detalle) return;
    setNombre(detalle.nombre);
    setObjetivo(detalle.objetivo);
    setAudiencia(detalle.audiencia);
    setFecha(detalle.fecha ?? "");
    setEditandoCampaign(true);
  }

  async function borrarCampaign(campaign: CampaignResumen | CampaignDetalle) {
    try {
      await deleteCampaign(campaign.id);
      setConfirmando(null);
      if (detalle?.id === campaign.id) setDetalle(null);
      await cargarCampaigns();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar la campaña."));
    }
  }

  async function añadirContent() {
    if (!detalle) return;
    try {
      const respuesta = await createContent(detalle.id, {
        titulo: "Contenido sin título",
      });
      await recargarDetalle();
      // Se abre el editor directamente: crear una tarjeta llamada "sin título"
      // y dejarla ahí obliga a un segundo clic que nadie quiere dar.
      setEditando(respuesta.content);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear el contenido."));
    }
  }

  async function cambiarEstadoContent(content: Content, estado: ContentEstado) {
    try {
      await updateContent(content.id, { estado });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cambiar el estado."));
    }
  }

  async function borrarContent(content: Content) {
    try {
      await deleteContent(content.id);
      setConfirmandoContent(null);
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar el contenido."));
    }
  }

  async function anadirEnlace(content: Content, enlace: string) {
    try {
      await updateContent(content.id, { enlaces: [...content.enlaces, enlace] });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo añadir el enlace."));
    }
  }

  async function quitarEnlace(content: Content, enlace: string) {
    try {
      await updateContent(content.id, {
        enlaces: content.enlaces.filter((e) => e !== enlace),
      });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo quitar el enlace."));
    }
  }

  async function alternarTarea(task: Task) {
    // Al desmarcar se vuelve a "en progreso", no a "pendiente": alguien que
    // desmarca está corrigiendo, no deshaciendo todo el trabajo hecho.
    const estado = task.estado === "acabado" ? "en_progreso" : "acabado";
    try {
      await updateTask(task.id, { estado });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo actualizar la tarea."));
    }
  }

  async function añadirTarea(contentId: number, titulo: string) {
    try {
      await createTask({ titulo, content_id: contentId });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la tarea."));
    }
  }

  if (isLoading) {
    return <p className="mkt-cargando-react">Cargando campañas...</p>;
  }

  // --- Detalle de una campaña ---
  if (detalle) {
    const todasLasTareas = [
      ...detalle.contents.flatMap((c) => c.tasks),
      ...detalle.tasks_sueltas,
    ];

    return (
      <section className="mkt-panel-react">
        {error ? <AlertBanner variant="error" message={error} /> : null}

        <button
          type="button"
          className="mkt-volver-react"
          onClick={() => setDetalle(null)}
        >
          ← Todas las campañas
        </button>

        {editandoCampaign ? (
          <form className="mkt-form-react" onSubmit={guardarCampaign}>
            <div className="field-group-react">
              <label htmlFor="mkt-edit-nombre">Nombre</label>
              <input
                id="mkt-edit-nombre"
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="mkt-edit-objetivo">Objetivo</label>
              <input
                id="mkt-edit-objetivo"
                type="text"
                value={objetivo}
                onChange={(event) => setObjetivo(event.target.value)}
              />
            </div>
            <div className="mkt-form-fila-react">
              <div className="field-group-react">
                <label htmlFor="mkt-edit-audiencia">Público</label>
                <input
                  id="mkt-edit-audiencia"
                  type="text"
                  value={audiencia}
                  onChange={(event) => setAudiencia(event.target.value)}
                />
              </div>
              <div className="field-group-react">
                <label htmlFor="mkt-edit-fecha">Fecha</label>
                <input
                  id="mkt-edit-fecha"
                  type="date"
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                />
              </div>
            </div>
            <div className="mkt-modal-acciones-react">
              <button type="submit" className="mkt-btn-react" disabled={!nombre.trim()}>
                Guardar
              </button>
              <button
                type="button"
                className="mkt-btn-mini-react"
                onClick={() => setEditandoCampaign(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <header className="mkt-detalle-header-react">
            <div>
              <h3>{detalle.nombre}</h3>
              {detalle.objetivo ? <p>{detalle.objetivo}</p> : null}
              <p className="mkt-meta-react">
                {detalle.audiencia ? `Para: ${detalle.audiencia}` : null}
                {detalle.audiencia && detalle.fecha ? " · " : null}
                {detalle.fecha ? formatearFecha(detalle.fecha, true) : null}
              </p>
            </div>
            <div className="mkt-content-acciones-react">
              <button
                type="button"
                className="mkt-btn-mini-react"
                onClick={empezarAEditarCampaign}
              >
                Editar campaña
              </button>
              <button
                type="button"
                className="mkt-btn-react"
                onClick={() => void añadirContent()}
              >
                + Contenido
              </button>
            </div>
          </header>
        )}

        <ProgresoCampaign tareas={todasLasTareas} />

        {detalle.contents.length === 0 ? (
          <p className="mkt-vacio-react">
            Todavía no hay contenidos. Un contenido es una pieza — un reel, un post,
            unas stories. Las tareas para sacarlo adelante van dentro.
          </p>
        ) : (
          <div className="mkt-contents-react">
            {detalle.contents.map((content) => (
              <article key={content.id} className="mkt-content-card-react">
                <header>
                  <div>
                    <h4>{content.titulo}</h4>
                    <p className="mkt-meta-react">
                      {[
                        content.tipo,
                        content.plataforma,
                        content.fecha_publicacion
                          ? formatearFecha(content.fecha_publicacion)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sin tipo ni plataforma"}
                    </p>
                  </div>
                  <div className="mkt-content-acciones-react">
                    <select
                      value={content.estado}
                      aria-label={`Estado de ${content.titulo}`}
                      onChange={(event) =>
                        void cambiarEstadoContent(
                          content,
                          event.target.value as ContentEstado,
                        )
                      }
                    >
                      {CONTENT_ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {CONTENT_ESTADO_LABEL[estado]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="mkt-btn-mini-react"
                      onClick={() => setEditando(content)}
                    >
                      Editar
                    </button>
                    {confirmandoContent === content.id ? (
                      <>
                        <button
                          type="button"
                          className="mkt-btn-mini-peligro-react"
                          onClick={() => void borrarContent(content)}
                        >
                          Sí, borrar
                        </button>
                        <button
                          type="button"
                          className="mkt-btn-mini-react"
                          onClick={() => setConfirmandoContent(null)}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="mkt-btn-borrar-react"
                        onClick={() => setConfirmandoContent(content.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </header>

                <AdjuntosDeContent
                  enlaces={content.enlaces}
                  onQuitar={(enlace) => void quitarEnlace(content, enlace)}
                />

                <EnlaceNuevo onAñadir={(enlace) => void anadirEnlace(content, enlace)} />

                <TareasDeContent
                  tasks={content.tasks}
                  onToggle={(task) => void alternarTarea(task)}
                  onAñadir={(titulo) => void añadirTarea(content.id, titulo)}
                />
              </article>
            ))}
          </div>
        )}

        {/* Antes se contaban en el progreso pero no se pintaban en ninguna
            parte: el usuario leía "1 de 13" viendo solo 12. */}
        {detalle.tasks_sueltas.length > 0 ? (
          <article className="mkt-content-card-react">
            <header>
              <div>
                <h4>Tareas de la campaña</h4>
                <p className="mkt-meta-react">No cuelgan de ningún contenido</p>
              </div>
            </header>
            <TareasDeContent
              tasks={detalle.tasks_sueltas}
              onToggle={(task) => void alternarTarea(task)}
              onAñadir={() => undefined}
            />
          </article>
        ) : null}

        <div className="mkt-zona-peligro-react">
          {confirmando === detalle.id ? (
            <p className="mkt-confirmar-react">
              Se borran también {detalle.contents.length} contenidos y{" "}
              {todasLasTareas.length} tareas. Esto no se puede deshacer.
              <button
                type="button"
                className="mkt-btn-mini-peligro-react"
                onClick={() => void borrarCampaign(detalle)}
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                className="mkt-btn-mini-react"
                onClick={() => setConfirmando(null)}
              >
                Cancelar
              </button>
            </p>
          ) : (
            <button
              type="button"
              className="mkt-btn-borrar-react"
              onClick={() => setConfirmando(detalle.id)}
            >
              Eliminar campaña
            </button>
          )}
        </div>

        {editando ? (
          <ContentEditor
            content={editando}
            onCerrar={() => setEditando(null)}
            onGuardado={() => {
              setEditando(null);
              void recargarDetalle();
            }}
          />
        ) : null}
      </section>
    );
  }

  // --- Listado ---
  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="mkt-panel-header-react">
        <p className="mkt-resumen-react">
          {campaigns.length === 0
            ? "Sin campañas"
            : `${campaigns.length} ${campaigns.length === 1 ? "campaña" : "campañas"}`}
        </p>
        <button
          type="button"
          className="mkt-btn-react"
          onClick={() => setMostrarFormulario((abierto) => !abierto)}
        >
          {mostrarFormulario ? "Cancelar" : "+ Nueva campaña"}
        </button>
      </header>

      {mostrarFormulario ? (
        <form className="mkt-form-react" onSubmit={enviarNueva}>
          <div className="field-group-react">
            <label htmlFor="mkt-nombre">Nombre</label>
            <input
              id="mkt-nombre"
              type="text"
              value={nombre}
              placeholder="Cómo empezar a invertir"
              onChange={(event) => setNombre(event.target.value)}
            />
          </div>
          <div className="field-group-react">
            <label htmlFor="mkt-objetivo">Objetivo</label>
            <input
              id="mkt-objetivo"
              type="text"
              value={objetivo}
              placeholder="Llenar la charla del 15 de octubre"
              onChange={(event) => setObjetivo(event.target.value)}
            />
          </div>
          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="mkt-audiencia">Público</label>
              <input
                id="mkt-audiencia"
                type="text"
                value={audiencia}
                placeholder="Estudiantes de la UPM"
                onChange={(event) => setAudiencia(event.target.value)}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="mkt-fecha">Fecha</label>
              <input
                id="mkt-fecha"
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="mkt-btn-react" disabled={!nombre.trim()}>
            Crear campaña
          </button>
        </form>
      ) : null}

      {campaigns.length === 0 ? (
        <p className="mkt-vacio-react">
          Aún no hay campañas. Una campaña agrupa todo lo que se publica alrededor
          de una idea o un evento.
        </p>
      ) : (
        <ul className="mkt-campaigns-react">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <button
                type="button"
                className="mkt-campaign-card-react"
                onClick={() => void abrir(campaign.id)}
              >
                <span className="mkt-campaign-nombre-react">{campaign.nombre}</span>
                {campaign.objetivo ? (
                  <span className="mkt-campaign-objetivo-react">{campaign.objetivo}</span>
                ) : null}
                <span className="mkt-meta-react">
                  {campaign.total_contents} contenidos · {campaign.total_tasks} tareas
                  {campaign.fecha ? ` · ${formatearFecha(campaign.fecha, true)}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
