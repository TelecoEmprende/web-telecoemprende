import { FormEvent, useCallback, useEffect, useState } from "react";

import { apiDepto } from "../../../api/marketing";
import { AlertBanner } from "../../feedback/AlertBanner";
import { ContadorCaracteres } from "../../feedback/ContadorCaracteres";
import { Esqueleto } from "../../feedback/Esqueleto";
import { AdjuntosDeContent } from "./AdjuntosDeContent";
import { ContentEditor } from "./ContentEditor";
import { Badge } from "@/components/ui/badge";
import type { ApiFailure } from "../../../types/api";
import type { Team } from "../../../types/equipo";
import {
  CONTENT_ESTADOS,
  CONTENT_ESTADO_LABEL,
  MAX_TEXTO_LARGO_LEN,
  MAX_TITULO_LEN,
  TASK_ESTADO_LABEL,
  formatearFecha,
  type CampaignDetalle,
  type CampaignResumen,
  type Content,
  type ContentEstado,
  type Task,
} from "../../../types/marketing";

const DEPTO_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

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
  /** Departamentos que se ven a la vez en el listado -- el filtro de la
   *  barra decide cuáles (ver `EquipoPage.tsx`). */
  deptos: Team[];
  /** Campaña que hay que abrir directamente (viene del calendario o de un
   *  enlace compartido); su departamento es siempre `deptos[0]`, porque
   *  quien la manda ya acota el filtro a ese departamento. */
  campaignInicial: number | null;
  onCampaignAbierta: () => void;
};

export function CampaignsPanel({ deptos, campaignInicial, onCampaignAbierta }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignResumen[]>([]);
  const [deptoNuevaCampaign, setDeptoNuevaCampaign] = useState<Team>(deptos[0]);
  const [detalle, setDetalle] = useState<CampaignDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editando, setEditando] = useState<Content | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoCampaign, setEditandoCampaign] = useState(false);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [duplicando, setDuplicando] = useState<number | null>(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState<number | null>(null);
  const [confirmandoContent, setConfirmandoContent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);
  const [archivando, setArchivando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [audiencia, setAudiencia] = useState("");
  const [fecha, setFecha] = useState("");

  const abrir = useCallback(async (id: number, depto: Team) => {
    try {
      const respuesta = await apiDepto(depto).getCampaign(id);
      setDetalle(respuesta.campaign);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo abrir la campaña."));
    }
  }, []);

  const cargarCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const respuestas = await Promise.all(deptos.map((d) => apiDepto(d).getCampaigns()));
      setCampaigns(respuestas.flatMap((r) => r.campaigns));
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudieron cargar las campañas."));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptos.join(",")]);

  useEffect(() => {
    void cargarCampaigns();
  }, [cargarCampaigns]);

  useEffect(() => {
    if (!deptos.includes(deptoNuevaCampaign)) setDeptoNuevaCampaign(deptos[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptos.join(",")]);

  useEffect(() => {
    // El departamento de una campaña que llega por enlace o desde el
    // calendario ya viene acotado en `deptos` (ver `EquipoPage.tsx`), así que
    // siempre es el primero.
    if (campaignInicial !== null) {
      void abrir(campaignInicial, deptos[0]);
      onCampaignAbierta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignInicial, abrir, onCampaignAbierta]);

  async function recargarDetalle() {
    if (detalle) await abrir(detalle.id, detalle.departamento);
  }

  async function enviarNueva(event: FormEvent) {
    event.preventDefault();
    if (!nombre.trim()) return;

    try {
      await apiDepto(deptoNuevaCampaign).createCampaign({
        nombre, objetivo, audiencia, fecha: fecha || null,
      });
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
      await apiDepto(detalle.departamento).updateCampaign(detalle.id, {
        nombre,
        objetivo,
        audiencia,
        fecha: fecha || null,
      });
      setEditandoCampaign(false);
      await abrir(detalle.id, detalle.departamento);
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
      await apiDepto(campaign.departamento).deleteCampaign(campaign.id);
      setConfirmando(null);
      if (detalle?.id === campaign.id) setDetalle(null);
      await cargarCampaigns();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar la campaña."));
    }
  }

  async function copiarEnlace(campaign: CampaignDetalle) {
    const url = `${window.location.origin}/equipo?campaign=${campaign.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setEnlaceCopiado(campaign.id);
      window.setTimeout(() => setEnlaceCopiado(null), 2000);
    } catch {
      setError("No se pudo copiar el enlace. Cópialo a mano: " + url);
    }
  }

  async function alternarArchivado(campaign: CampaignDetalle) {
    setArchivando(true);
    try {
      await apiDepto(campaign.departamento).updateCampaign(campaign.id, {
        archivado: !campaign.archivado,
      });
      await abrir(campaign.id, campaign.departamento);
      await cargarCampaigns();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo archivar la campaña."));
    } finally {
      setArchivando(false);
    }
  }

  async function duplicarCampaign(campaign: CampaignResumen | CampaignDetalle) {
    setDuplicando(campaign.id);
    try {
      const respuesta = await apiDepto(campaign.departamento).duplicateCampaign(campaign.id);
      await cargarCampaigns();
      setDetalle(respuesta.campaign);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo duplicar la campaña."));
    } finally {
      setDuplicando(null);
    }
  }

  async function añadirContent() {
    if (!detalle) return;
    try {
      const respuesta = await apiDepto(detalle.departamento).createContent(detalle.id, {
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
    if (!detalle) return;
    try {
      await apiDepto(detalle.departamento).updateContent(content.id, { estado });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cambiar el estado."));
    }
  }

  async function borrarContent(content: Content) {
    if (!detalle) return;
    try {
      await apiDepto(detalle.departamento).deleteContent(content.id);
      setConfirmandoContent(null);
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar el contenido."));
    }
  }

  async function anadirEnlace(content: Content, enlace: string) {
    if (!detalle) return;
    try {
      await apiDepto(detalle.departamento).updateContent(content.id, {
        enlaces: [...content.enlaces, enlace],
      });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo añadir el enlace."));
    }
  }

  async function quitarEnlace(content: Content, enlace: string) {
    if (!detalle) return;
    try {
      await apiDepto(detalle.departamento).updateContent(content.id, {
        enlaces: content.enlaces.filter((e) => e !== enlace),
      });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo quitar el enlace."));
    }
  }

  async function alternarTarea(task: Task) {
    if (!detalle) return;
    // Al desmarcar se vuelve a "en progreso", no a "pendiente": alguien que
    // desmarca está corrigiendo, no deshaciendo todo el trabajo hecho.
    const estado = task.estado === "acabado" ? "en_progreso" : "acabado";
    try {
      await apiDepto(detalle.departamento).updateTask(task.id, { estado });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo actualizar la tarea."));
    }
  }

  async function añadirTarea(contentId: number, titulo: string) {
    if (!detalle) return;
    try {
      await apiDepto(detalle.departamento).createTask({ titulo, content_id: contentId });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la tarea."));
    }
  }

  if (isLoading) {
    return <Esqueleto filas={3} alto={92} />;
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
              <ContadorCaracteres valor={nombre} maximo={MAX_TITULO_LEN} />
            </div>
            <div className="field-group-react">
              <label htmlFor="mkt-edit-objetivo">Objetivo</label>
              <input
                id="mkt-edit-objetivo"
                type="text"
                value={objetivo}
                onChange={(event) => setObjetivo(event.target.value)}
              />
              <ContadorCaracteres valor={objetivo} maximo={MAX_TEXTO_LARGO_LEN} />
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
                <ContadorCaracteres valor={audiencia} maximo={MAX_TEXTO_LARGO_LEN} />
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
              <h3>
                {detalle.nombre}
                {detalle.archivado ? (
                  <Badge variant="secondary" className="mkt-archivada-badge-react">
                    Archivada
                  </Badge>
                ) : null}
              </h3>
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
                className="mkt-btn-mini-react"
                disabled={duplicando === detalle.id}
                onClick={() => void duplicarCampaign(detalle)}
              >
                {duplicando === detalle.id ? "Duplicando..." : "Duplicar"}
              </button>
              <button
                type="button"
                className="mkt-btn-mini-react"
                onClick={() => void copiarEnlace(detalle)}
              >
                {enlaceCopiado === detalle.id ? "Enlace copiado" : "Copiar enlace"}
              </button>
              <button
                type="button"
                className="mkt-btn-mini-react"
                disabled={archivando}
                onClick={() => void alternarArchivado(detalle)}
              >
                {archivando ? "Guardando..." : detalle.archivado ? "Desarchivar" : "Archivar"}
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
  const visibles = campaigns.filter((c) => mostrarArchivadas || !c.archivado);
  const archivadasCount = campaigns.filter((c) => c.archivado).length;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="crm-cabecera-react">
        <h3 className="crm-h1">
          {visibles.length === 0
            ? "Sin campañas"
            : `${visibles.length} ${visibles.length === 1 ? "campaña" : "campañas"}`}
        </h3>
        <div className="crm-tags-react">
          {archivadasCount > 0 ? (
            <label
              className={`crm-tag crm-tag-check-react${mostrarArchivadas ? " crm-tag-azul-react" : ""}`}
            >
              <input
                type="checkbox"
                className="crm-check"
                checked={mostrarArchivadas}
                onChange={(event) => setMostrarArchivadas(event.target.checked)}
              />
              Archivadas ({archivadasCount})
            </label>
          ) : null}
          <button
            type="button"
            className="crm-btn"
            onClick={() => setMostrarFormulario((abierto) => !abierto)}
          >
            {mostrarFormulario ? "Cancelar" : "+ Nueva campaña"}
          </button>
        </div>
      </header>

      {mostrarFormulario ? (
        <form className="mkt-form-react" onSubmit={enviarNueva}>
          {deptos.length > 1 ? (
            <div className="field-group-react">
              <label htmlFor="mkt-depto">Departamento</label>
              <select
                id="mkt-depto"
                value={deptoNuevaCampaign}
                onChange={(event) => setDeptoNuevaCampaign(event.target.value as Team)}
              >
                {deptos.map((d) => (
                  <option key={d} value={d}>
                    {DEPTO_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field-group-react">
            <label htmlFor="mkt-nombre">Nombre</label>
            <input
              id="mkt-nombre"
              type="text"
              value={nombre}
              placeholder="Cómo empezar a invertir"
              onChange={(event) => setNombre(event.target.value)}
            />
            <ContadorCaracteres valor={nombre} maximo={MAX_TITULO_LEN} />
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
            <ContadorCaracteres valor={objetivo} maximo={MAX_TEXTO_LARGO_LEN} />
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
              <ContadorCaracteres valor={audiencia} maximo={MAX_TEXTO_LARGO_LEN} />
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

      {visibles.length === 0 ? (
        <p className="mkt-vacio-react">
          {campaigns.length === 0
            ? "Aún no hay campañas. Una campaña agrupa todo lo que se publica alrededor de una idea o un evento."
            : "Todas las campañas están archivadas."}
        </p>
      ) : (
        <ul className="mkt-campaigns-react">
          {visibles.map((campaign) => (
            <li key={campaign.id}>
              <button
                type="button"
                className="mkt-campaign-card-react"
                onClick={() => void abrir(campaign.id, campaign.departamento)}
              >
                <span className="mkt-campaign-nombre-react">
                  {campaign.nombre}
                  {deptos.length > 1 ? (
                    <Badge variant="outline">{DEPTO_LABEL[campaign.departamento]}</Badge>
                  ) : null}
                  {campaign.archivado ? (
                    <Badge variant="secondary" className="mkt-archivada-badge-react">
                      Archivada
                    </Badge>
                  ) : null}
                </span>
                {campaign.objetivo ? (
                  <span className="mkt-campaign-objetivo-react">{campaign.objetivo}</span>
                ) : null}
                <span className="mkt-meta-react">
                  {campaign.total_contents} contenidos · {campaign.total_tasks} tareas
                  {campaign.fecha ? ` · ${formatearFecha(campaign.fecha, true)}` : ""}
                </span>
                {campaign.total_tasks > 0 ? (
                  <span className="crm-campaign-progreso-react">
                    <span className="crm-bar" aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.round((campaign.tareas_acabadas / campaign.total_tasks) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="crm-s">
                      {Math.round((campaign.tareas_acabadas / campaign.total_tasks) * 100)}%
                    </span>
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="mkt-btn-mini-react"
                disabled={duplicando === campaign.id}
                onClick={() => void duplicarCampaign(campaign)}
              >
                {duplicando === campaign.id ? "Duplicando..." : "Duplicar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
