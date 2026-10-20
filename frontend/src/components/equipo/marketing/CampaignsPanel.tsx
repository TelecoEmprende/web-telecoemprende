import { motion, useReducedMotion } from "motion/react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { CabeceraPanel } from "../CabeceraPanel";
import { Esqueleto } from "../../feedback/Esqueleto";
import { restaurar } from "../../../api/club";
import { apiDepto } from "../../../api/marketing";
import { AlertBanner } from "../../feedback/AlertBanner";
import { ContadorCaracteres } from "../../feedback/ContadorCaracteres";
import { AmbitoChips, etiquetaAmbito } from "../club/AmbitoChips";
import { HistorialCargado } from "../club/HistorialLista";
import { ResponsableSelect } from "../club/ResponsableSelect";
import { AvatarResponsable, etiquetaDe } from "./Avatares";
import { DeptoProvider, useDirectorio } from "../DeptoApi";
import { AdjuntosDeContent } from "./AdjuntosDeContent";
import { ContentEditor } from "./ContentEditor";
import { NotasDelProyecto } from "./NotasDelProyecto";
import { Badge } from "@/components/ui/badge";
import { useEntradaDeFila } from "../../movimiento";
import { SPRING_DEFAULT } from "@/components/smoothui/lib/animation";
import type { ApiFailure } from "../../../types/api";
import { TEAMS, type Team } from "../../../types/equipo";
import {
  CONTENT_ESTADOS,
  CONTENT_ESTADO_LABEL,
  PROYECTO_ESTADOS,
  PROYECTO_ESTADO_LABEL,
  type ProyectoEstado,
  MAX_TEXTO_LARGO_LEN,
  MAX_TITULO_LEN,
  TASK_ESTADO_LABEL,
  formatearFecha,
  type CampaignDetalle,
  type CampaignResumen,
  type Content,
  type ContentEstado,
  type Task,
  type TaskEstado,
} from "../../../types/marketing";

function mensajeDeError(error: unknown, porDefecto: string) {
  const fallo = error as ApiFailure;
  return fallo?.message || porDefecto;
}

/** Barra de progreso de una campaña: cuántas de sus tareas están acabadas. */
function ProgresoCampaign({ tareas }: { tareas: Task[] }) {
  const menos = useReducedMotion();
  if (tareas.length === 0) return null;

  const acabadas = tareas.filter((t) => t.estado === "acabado").length;
  const porcentaje = Math.round((acabadas / tareas.length) * 100);

  return (
    <div className="mkt-progreso-react">
      <div className="mkt-progreso-barra-react" aria-hidden="true">
        <motion.span
          initial={{ transform: "scaleX(0)" }}
          animate={{ transform: `scaleX(${porcentaje / 100})` }}
          transition={menos ? { duration: 0 } : SPRING_DEFAULT}
        />
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
        aria-label="Nuevo enlace del entregable"
        onChange={(event) => setValor(event.target.value)}
      />
      <button type="submit" className="mkt-btn-mini-react" disabled={!valor.trim()}>
        Adjuntar
      </button>
    </form>
  );
}

/** Lo que sitúa un proyecto de un vistazo: de quién es, en qué punto está y
 *  quién lo lleva. Va igual en el listado y en el detalle. */
function FichaProyecto({
  proyecto,
  directorio,
}: {
  proyecto: Pick<CampaignResumen, "departamentos" | "estado" | "responsable">;
  directorio: Record<string, string>;
}) {
  return (
    <span className="mkt-ficha-proyecto-react">
      {etiquetaAmbito(proyecto.departamentos).map((e) => (
        <Badge key={e} variant="outline">
          {e}
        </Badge>
      ))}
      <Badge variant="secondary" className={`mkt-estado-proyecto-react is-${proyecto.estado}`}>
        {PROYECTO_ESTADO_LABEL[proyecto.estado]}
      </Badge>
      {proyecto.responsable ? (
        <span className="mkt-responsable-react">
          <AvatarResponsable email={proyecto.responsable} nombre={directorio[proyecto.responsable]} />
          {etiquetaDe(proyecto.responsable, directorio[proyecto.responsable])}
        </span>
      ) : (
        <span className="mkt-responsable-react is-vacio">Sin responsable</span>
      )}
    </span>
  );
}

type Props = {
  /** Departamentos que se ven a la vez en el listado -- el filtro de la
   *  barra decide cuáles (ver `EquipoPage.tsx`). */
  deptos: Team[];
  /** Campaña que hay que abrir directamente (viene del calendario o de un
   *  enlace compartido); se busca primero en `deptos[0]`. */
  campaignInicial: number | null;
  onCampaignAbierta: () => void;
  /** Abre una nota enlazada en Notas. */
  onAbrirNota: (id: number) => void;
};

export function CampaignsPanel({ deptos, campaignInicial, onCampaignAbierta, onAbrirNota }: Props) {
  const menosMovimiento = useReducedMotion();
  const entradaFila = useEntradaDeFila();
  const [campaigns, setCampaigns] = useState<CampaignResumen[]>([]);
  const [detalle, setDetalle] = useState<CampaignDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editando, setEditando] = useState<Content | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoCampaign, setEditandoCampaign] = useState(false);
  const [duplicando, setDuplicando] = useState<number | null>(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);
  const [archivando, setArchivando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [audiencia, setAudiencia] = useState("");
  const [fecha, setFecha] = useState("");
  // De qué es el proyecto, en qué punto está y quién lo lleva: por defecto, del
  // departamento que se está mirando, activo y sin responsable.
  const [ambito, setAmbito] = useState<Team[]>([deptos[0]]);
  const [estadoProyecto, setEstadoProyecto] = useState<ProyectoEstado>("activo");
  const [responsable, setResponsable] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"" | ProyectoEstado>("");
  const [verHistorial, setVerHistorial] = useState(false);
  // Lo borrado va a la papelera, no se pierde: el aviso trae el «Deshacer».
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => Promise<void> } | null>(null);
  const directorio = useDirectorio();

  // Un enlace compartido no dice de qué departamento es el proyecto: si no
  // está en `depto`, se prueba en los otros (todos somos de los tres).
  const abrir = useCallback(async (id: number, depto: Team) => {
    let ultimo: unknown = null;
    for (const d of [depto, ...TEAMS.filter((t) => t !== depto)]) {
      try {
        const respuesta = await apiDepto(d).getCampaign(id);
        setDetalle(respuesta.campaign);
        setError(null);
        return;
      } catch (err) {
        ultimo = err;
      }
    }
    setError(mensajeDeError(ultimo, "No se pudo abrir el proyecto."));
  }, []);

  // Solo la primera carga enseña el esqueleto: al recargar tras un cambio, la
  // lista (o el proyecto abierto) se queda en pantalla y se actualiza encima.
  const cargarCampaigns = useCallback(async () => {
    try {
      const respuesta = await apiDepto(deptos[0]).getCampaigns(deptos);
      setCampaigns(respuesta.campaigns);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudieron cargar los proyectos."));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptos.join(",")]);

  useEffect(() => {
    void cargarCampaigns();
  }, [cargarCampaigns]);

  useEffect(() => {
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
      await apiDepto(ambito[0]).createCampaign({
        nombre,
        objetivo,
        audiencia,
        fecha: fecha || null,
        departamentos: ambito,
        estado: estadoProyecto,
        responsable,
      });
      setNombre("");
      setObjetivo("");
      setAudiencia("");
      setFecha("");
      setAmbito([deptos[0]]);
      setEstadoProyecto("activo");
      setResponsable("");
      setMostrarFormulario(false);
      await cargarCampaigns();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear el proyecto."));
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
        departamentos: ambito,
        estado: estadoProyecto,
        responsable,
      });
      setEditandoCampaign(false);
      // Si el departamento desde el que se abrió ya no es del ámbito, el
      // proyecto se vuelve a abrir por uno que sí lo es.
      await abrir(detalle.id, ambito.includes(detalle.departamento) ? detalle.departamento : ambito[0]);
      await cargarCampaigns();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar el proyecto."));
    }
  }

  function empezarAEditarCampaign() {
    if (!detalle) return;
    setNombre(detalle.nombre);
    setObjetivo(detalle.objetivo);
    setAudiencia(detalle.audiencia);
    setFecha(detalle.fecha ?? "");
    setAmbito(detalle.departamentos);
    setEstadoProyecto(detalle.estado);
    setResponsable(detalle.responsable);
    setEditandoCampaign(true);
  }

  async function borrarCampaign(campaign: CampaignResumen | CampaignDetalle) {
    try {
      await apiDepto(campaign.departamento).deleteCampaign(campaign.id);
      if (detalle?.id === campaign.id) setDetalle(null);
      await cargarCampaigns();
      setAviso({
        texto: `«${campaign.nombre}» está en la papelera (30 días).`,
        deshacer: async () => {
          await restaurar("proyecto", campaign.id);
          await cargarCampaigns();
        },
      });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar el proyecto."));
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
      setError(mensajeDeError(err, "No se pudo archivar el proyecto."));
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
      setError(mensajeDeError(err, "No se pudo duplicar el proyecto."));
    } finally {
      setDuplicando(null);
    }
  }

  async function añadirContent() {
    if (!detalle) return;
    try {
      const respuesta = await apiDepto(detalle.departamento).createContent(detalle.id, {
        titulo: "Entregable sin título",
      });
      await recargarDetalle();
      // Se abre el editor directamente: crear una tarjeta llamada "sin título"
      // y dejarla ahí obliga a un segundo clic que nadie quiere dar.
      setEditando(respuesta.content);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear el entregable."));
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
      await recargarDetalle();
      setAviso({
        texto: `«${content.titulo}» está en la papelera (30 días).`,
        deshacer: async () => {
          await restaurar("entregable", content.id);
          await recargarDetalle();
        },
      });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar el entregable."));
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
    const estado: TaskEstado = task.estado === "acabado" ? "en_progreso" : "acabado";
    // La casilla cambia al momento; si el servidor dice que no, se recarga
    // el proyecto tal como está.
    const conEstado = (t: Task) => (t.id === task.id ? { ...t, estado } : t);
    setDetalle({
      ...detalle,
      contents: detalle.contents.map((c) => ({ ...c, tasks: c.tasks.map(conEstado) })),
      tasks_sueltas: detalle.tasks_sueltas.map(conEstado),
    });
    try {
      // Un proyecto trae tareas de cualquier departamento: cada una se guarda
      // por la ruta del suyo, no por la del proyecto.
      await apiDepto((task.departamento as Team) || detalle.departamento).updateTask(task.id, { estado });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo actualizar la tarea."));
      await recargarDetalle();
    }
  }

  async function añadirTarea(contentId: number, titulo: string) {
    if (!detalle) return;
    try {
      // Las instrucciones son obligatorias al crear una tarea: sin ellas, el
      // alta rápida desde un entregable fallaba siempre con un 400.
      const entregable = detalle.contents.find((c) => c.id === contentId);
      await apiDepto(detalle.departamento).createTask({
        titulo,
        content_id: contentId,
        instrucciones: `Del entregable «${entregable?.titulo ?? ""}» de «${detalle.nombre}».`,
      });
      await recargarDetalle();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la tarea."));
    }
  }

  if (isLoading) {
    return <Esqueleto filas={3} alto={92} />;
  }

  const avisoBanner = aviso ? (
    <AlertBanner
      variant="success"
      message={aviso.texto}
      action={
        aviso.deshacer
          ? {
              label: "Deshacer",
              onClick: () => {
                const deshacer = aviso.deshacer;
                setAviso(null);
                void deshacer?.().catch(() => setError("No se pudo restaurar."));
              },
            }
          : undefined
      }
    />
  ) : null;

  // --- Detalle de una campaña ---
  if (detalle) {
    const todasLasTareas = [
      ...detalle.contents.flatMap((c) => c.tasks),
      ...detalle.tasks_sueltas,
    ];

    return (
      <section className="mkt-panel-react">
        {error ? <AlertBanner variant="error" message={error} /> : null}
        {avisoBanner}

        <button
          type="button"
          className="mkt-volver-react"
          onClick={() => {
            setDetalle(null);
            // Lo hecho dentro (tareas marcadas, entregables) cambia el progreso.
            void cargarCampaigns();
          }}
        >
          ← Todos los proyectos
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
            <div className="field-group-react">
              <label htmlFor="mkt-edit-ambito">De quién es</label>
              <AmbitoChips value={ambito} onChange={setAmbito} idPrefix="mkt-edit-ambito" />
            </div>
            <div className="mkt-form-fila-react">
              <div className="field-group-react">
                <label htmlFor="mkt-edit-estado">Estado</label>
                <select
                  id="mkt-edit-estado"
                  value={estadoProyecto}
                  onChange={(event) => setEstadoProyecto(event.target.value as ProyectoEstado)}
                >
                  {PROYECTO_ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {PROYECTO_ESTADO_LABEL[e]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group-react">
                <label htmlFor="mkt-edit-responsable">Responsable</label>
                <ResponsableSelect id="mkt-edit-responsable" value={responsable} onChange={setResponsable} />
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
              <FichaProyecto proyecto={detalle} directorio={directorio} />
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
                Editar proyecto
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
                + Entregable
              </button>
            </div>
          </header>
        )}

        <ProgresoCampaign tareas={todasLasTareas} />

        <NotasDelProyecto
          proyectoId={detalle.id}
          proyectoNombre={detalle.nombre}
          departamento={detalle.departamento}
          onAbrirNota={onAbrirNota}
        />

        {detalle.contents.length === 0 ? (
          <p className="mkt-vacio-react">
            Todavía no hay entregables. Un entregable es cada cosa que sale del
            proyecto — un reel, la reserva del aula, una funcionalidad de la web. Las
            tareas para sacarlo adelante van dentro.
          </p>
        ) : (
          <div className="mkt-contents-react">
            {detalle.contents.map((content, indice) => (
              <motion.article
                key={content.id}
                className="mkt-content-card-react"
                {...entradaFila(indice)}
              >
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
                    <button
                      type="button"
                      className="mkt-btn-borrar-react"
                      onClick={() => void borrarContent(content)}
                    >
                      Eliminar
                    </button>
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
              </motion.article>
            ))}
          </div>
        )}

        {/* Antes se contaban en el progreso pero no se pintaban en ninguna
            parte: el usuario leía "1 de 13" viendo solo 12. */}
        {detalle.tasks_sueltas.length > 0 ? (
          <article className="mkt-content-card-react">
            <header>
              <div>
                <h4>Tareas del proyecto</h4>
                <p className="mkt-meta-react">No cuelgan de ningún entregable</p>
              </div>
            </header>
            <TareasDeContent
              tasks={detalle.tasks_sueltas}
              onToggle={(task) => void alternarTarea(task)}
              onAñadir={() => undefined}
            />
          </article>
        ) : null}

        <details
          className="mkt-historial-react"
          open={verHistorial}
          onToggle={(e) => setVerHistorial((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary>Historial del proyecto</summary>
          {verHistorial ? <HistorialCargado proyectoId={detalle.id} /> : null}
        </details>

        <div className="mkt-zona-peligro-react">
          <button
            type="button"
            className="mkt-btn-borrar-react"
            onClick={() => void borrarCampaign(detalle)}
          >
            Enviar proyecto a la papelera
          </button>
          <p className="mkt-meta-react">
            Se lleva sus {detalle.contents.length} entregables y {todasLasTareas.length} tareas, y se
            puede restaurar durante 30 días.
          </p>
        </div>

        {editando ? (
          // Guarda por la ruta del proyecto, no por la del departamento que se
          // está mirando: un proyecto solo de Eventos no se tocaba desde otra.
          <DeptoProvider value={detalle.departamento}>
            <ContentEditor
              content={editando}
              onCerrar={() => setEditando(null)}
              onGuardado={() => {
                setEditando(null);
                void recargarDetalle();
              }}
            />
          </DeptoProvider>
        ) : null}
      </section>
    );
  }

  // --- Listado ---
  const visibles = campaigns
    .filter((c) => mostrarArchivadas || !c.archivado)
    .filter((c) => filtroEstado === "" || c.estado === filtroEstado);
  const archivadasCount = campaigns.filter((c) => c.archivado).length;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}
      {avisoBanner}

      <CabeceraPanel descripcion="Cada proyecto tiene sus entregables, y cada entregable sus tareas. Cualquiera puede crear y editar.">
        <button
          type="button"
          className="crm-btn"
          onClick={() => setMostrarFormulario((abierto) => !abierto)}
        >
          {mostrarFormulario ? "Cancelar" : "+ Nuevo proyecto"}
        </button>
      </CabeceraPanel>

      <div className="crm-barra-react">
        <p className="crm-k mr-auto">
          {visibles.length === 0
            ? "Sin proyectos"
            : `${visibles.length} ${visibles.length === 1 ? "proyecto" : "proyectos"}`}
        </p>
          <select
            value={filtroEstado}
            aria-label="Filtrar por estado"
            onChange={(event) => setFiltroEstado(event.target.value as "" | ProyectoEstado)}
          >
            <option value="">Cualquier estado</option>
            {PROYECTO_ESTADOS.map((e) => (
              <option key={e} value={e}>
                {PROYECTO_ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
          {archivadasCount > 0 ? (
            <label
              className={`crm-tag crm-tag-check-react${mostrarArchivadas ? " crm-tag-activo-react" : ""}`}
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
      </div>

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
          <div className="field-group-react">
            <label htmlFor="mkt-ambito">De quién es</label>
            <AmbitoChips value={ambito} onChange={setAmbito} idPrefix="mkt-ambito" />
          </div>
          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="mkt-estado">Estado</label>
              <select
                id="mkt-estado"
                value={estadoProyecto}
                onChange={(event) => setEstadoProyecto(event.target.value as ProyectoEstado)}
              >
                {PROYECTO_ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {PROYECTO_ESTADO_LABEL[e]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group-react">
              <label htmlFor="mkt-responsable">Responsable</label>
              <ResponsableSelect id="mkt-responsable" value={responsable} onChange={setResponsable} />
            </div>
          </div>
          <button type="submit" className="mkt-btn-react" disabled={!nombre.trim()}>
            Crear proyecto
          </button>
        </form>
      ) : null}

      {visibles.length === 0 ? (
        <p className="mkt-vacio-react">
          {campaigns.length === 0
            ? "Aún no hay proyectos. Un proyecto agrupa todo lo que hace falta para sacar adelante una idea, un evento o una mejora."
            : "Todos los proyectos están archivados."}
        </p>
      ) : (
        <ul className="mkt-campaigns-react">
          {visibles.map((campaign, indice) => (
            <motion.li key={campaign.id} {...entradaFila(indice)}>
              <button
                type="button"
                className="mkt-campaign-card-react"
                onClick={() => void abrir(campaign.id, campaign.departamento)}
              >
                <span className="mkt-campaign-nombre-react">
                  {campaign.nombre}
                  {campaign.archivado ? (
                    <Badge variant="secondary" className="mkt-archivada-badge-react">
                      Archivada
                    </Badge>
                  ) : null}
                </span>
                <FichaProyecto proyecto={campaign} directorio={directorio} />
                {campaign.objetivo ? (
                  <span className="mkt-campaign-objetivo-react">{campaign.objetivo}</span>
                ) : null}
                <span className="mkt-meta-react">
                  {campaign.total_contents} entregables · {campaign.total_tasks} tareas
                  {campaign.fecha ? ` · ${formatearFecha(campaign.fecha, true)}` : ""}
                </span>
                {campaign.total_tasks > 0 ? (
                  <span className="crm-campaign-progreso-react">
                    <span className="crm-bar" aria-hidden="true">
                      <motion.i
                        initial={{ transform: "scaleX(0)" }}
                        animate={{
                          transform: `scaleX(${campaign.tareas_acabadas / campaign.total_tasks})`,
                        }}
                        transition={menosMovimiento ? { duration: 0 } : SPRING_DEFAULT}
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
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
