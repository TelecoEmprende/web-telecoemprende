import { useCallback, useEffect, useMemo, useState } from "react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { AvataresDeResponsables } from "./Avatares";
import { Badge } from "@/components/ui/badge";
import type { ApiFailure } from "../../../types/api";
import {
  CONTENT_ESTADOS,
  CONTENT_ESTADO_LABEL,
  diasHasta,
  formatearFecha,
  type CalendarioItem,
  type CampaignResumen,
  type Task,
} from "../../../types/marketing";

/**
 * La pantalla de entrada.
 *
 * Dos preguntas la gobiernan: "qué tengo que hacer" y "qué falta para lo que
 * se publica ya". Las tarjetas de arriba dan el resumen del departamento
 * entero (cuántas campañas hay en marcha, en qué fase está el contenido) --
 * lo que antes solo se veía entrando en Campañas -- y el timeline de abajo
 * ordena por día en vez de por estado: hoy, mañana, y las publicaciones
 * marcadas como hitos en su día, no en una lista aparte.
 */

function iso(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** "hace 2 días" pesa distinto que "vie, 9 oct". El texto lleva la urgencia. */
function cuando(deadline: string | null) {
  const dias = diasHasta(deadline);
  if (dias === null) return { texto: "Sin fecha", tono: "neutro" as const };
  if (dias < -1) return { texto: `Hace ${Math.abs(dias)} días`, tono: "tarde" as const };
  if (dias === -1) return { texto: "Ayer", tono: "tarde" as const };
  if (dias === 0) return { texto: "Hoy", tono: "hoy" as const };
  if (dias === 1) return { texto: "Mañana", tono: "pronto" as const };
  return { texto: formatearFecha(deadline), tono: "neutro" as const };
}

/** Cuánto falta para un día del timeline: "Hoy", "Mañana" o la fecha. */
function etiquetaDia(fechaISO: string, dias: number) {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return formatearFecha(fechaISO);
}

function FilaTarea({ task, onHecha }: { task: Task; onHecha: (t: Task) => void }) {
  const momento = cuando(task.deadline);

  return (
    <li className="mkt-fila-react">
      <label className="mkt-fila-check-react">
        <input
          type="checkbox"
          checked={task.estado === "acabado"}
          onChange={() => onHecha(task)}
        />
        <span className="mkt-fila-texto-react">
          {task.content_titulo || task.campaign_nombre ? (
            <span className="mkt-fila-padre-react">
              {task.content_titulo ?? task.campaign_nombre}
            </span>
          ) : null}
          <span className="mkt-fila-titulo-react">{task.titulo}</span>
        </span>
      </label>

      <span className="mkt-fila-derecha-react">
        <AvataresDeResponsables responsables={task.responsables} maximo={2} />
        <span className={`mkt-cuando-react mkt-cuando-${momento.tono}-react`}>
          {momento.texto}
        </span>
      </span>
    </li>
  );
}

/** La publicación como hito del día: no una fila más, el motivo del día. */
function Hito({ pub, pendientes }: { pub: CalendarioItem; pendientes: number }) {
  return (
    <div className="mkt-tl-hito-react">
      <span className="mkt-fila-padre-react">{pub.padre}</span>
      <span className="mkt-tl-hito-titulo-react">{pub.titulo}</span>
      <span className={pendientes === 0 ? "mkt-listo-react" : "mkt-pendientes-react"}>
        {pendientes === 0
          ? "Listo para publicar"
          : pendientes === 1
            ? "Falta 1 tarea"
            : `Faltan ${pendientes} tareas`}
      </span>
    </div>
  );
}

/** Cuántos días hacia delante mira el timeline: más allá de esto, mejor
 *  entrar en Calendario que desplazar la vista de entrada sin fin. */
const HORIZONTE_DIAS = 30;

export function WeekPanel() {
  const { getCalendario, getCampaigns, getTasks, updateTask } = useApi();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [publicaciones, setPublicaciones] = useState<CalendarioItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignResumen[]>([]);
  const [usuario, setUsuario] = useState("");
  const [soloMias, setSoloMias] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const hoy = new Date();
    const dentroDeUnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());

    try {
      const [respuestaTasks, respuestaCal, respuestaCampaigns] = await Promise.all([
        getTasks(),
        getCalendario(iso(hoy), iso(dentroDeUnMes)),
        getCampaigns(),
      ]);
      setTasks(respuestaTasks.tasks);
      setUsuario(respuestaTasks.usuario);
      setPublicaciones(respuestaCal.items.filter((i) => i.origen === "content"));
      setCampaigns(respuestaCampaigns.campaigns);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo cargar el resumen.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function marcarHecha(task: Task) {
    const estado = task.estado === "acabado" ? "pendiente" : "acabado";
    setTasks((actuales) =>
      actuales.map((t) => (t.id === task.id ? { ...t, estado } : t)),
    );
    try {
      await updateTask(task.id, { estado });
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo actualizar la tarea.");
      await cargar();
    }
  }

  // En qué fase está el contenido de todo el departamento, no solo el mío --
  // lo que antes solo se veía entrando campaña por campaña.
  const pipeline = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const pub of publicaciones) {
      conteo.set(pub.estado, (conteo.get(pub.estado) ?? 0) + 1);
    }
    return CONTENT_ESTADOS.map((estado) => ({ estado, total: conteo.get(estado) ?? 0 })).filter(
      (fase) => fase.total > 0,
    );
  }, [publicaciones]);

  if (isLoading) return <p className="mkt-cargando-react">Cargando...</p>;

  const mias = soloMias
    ? tasks.filter((t) => t.responsables.includes(usuario))
    : tasks;
  const abiertas = mias.filter((t) => t.estado !== "acabado");

  const vencidas = abiertas.filter((t) => (diasHasta(t.deadline) ?? 99) < 0);
  const sinFecha = abiertas.filter((t) => t.deadline === null);

  const totalPendientes = abiertas.length - sinFecha.length;
  const deMisTareas = tasks.filter(
    (t) => t.estado !== "acabado" && t.responsables.includes(usuario),
  ).length;
  const publicacionesSemana = publicaciones.filter((p) => {
    const d = diasHasta(p.fecha);
    return d !== null && d >= 0 && d <= 7;
  });

  // Un día del timeline puede traer tareas, una publicación, o las dos --
  // igual que en un calendario de verdad, no como columnas separadas por
  // estado. `Map` conserva la fecha ISO como clave para no reconstruirla.
  type DiaTimeline = { fecha: string; dias: number; tareas: Task[]; publicaciones: CalendarioItem[] };
  const porDia = new Map<string, DiaTimeline>();
  function diaDe(fechaISO: string, dias: number) {
    let entrada = porDia.get(fechaISO);
    if (!entrada) {
      entrada = { fecha: fechaISO, dias, tareas: [], publicaciones: [] };
      porDia.set(fechaISO, entrada);
    }
    return entrada;
  }
  for (const t of abiertas) {
    const dias = diasHasta(t.deadline);
    if (t.deadline && dias !== null && dias >= 0 && dias <= HORIZONTE_DIAS) {
      diaDe(t.deadline, dias).tareas.push(t);
    }
  }
  for (const p of publicaciones) {
    const dias = diasHasta(p.fecha);
    if (dias !== null && dias >= 0 && dias <= HORIZONTE_DIAS) {
      diaDe(p.fecha, dias).publicaciones.push(p);
    }
  }
  const dias = [...porDia.values()].sort((a, b) => a.dias - b.dias);

  const vacio = vencidas.length === 0 && dias.length === 0 && sinFecha.length === 0;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <div className="mkt-tiles-react">
        <div className="mkt-tile-react">
          <span className="mkt-tile-numero-react">{totalPendientes}</span>
          <span className="mkt-tile-label-react">Pendientes</span>
        </div>
        <div
          className={`mkt-tile-react${vencidas.length > 0 ? " mkt-tile-alerta-react" : ""}`}
        >
          <span className="mkt-tile-numero-react">{vencidas.length}</span>
          <span className="mkt-tile-label-react">Vencidas</span>
        </div>
        <div className="mkt-tile-react">
          <span className="mkt-tile-numero-react">{publicacionesSemana.length}</span>
          <span className="mkt-tile-label-react">Se publica en 7 días</span>
        </div>
        <div className="mkt-tile-react">
          <span className="mkt-tile-numero-react">{deMisTareas}</span>
          <span className="mkt-tile-label-react">Asignadas a ti</span>
        </div>
      </div>

      <div className="mkt-resumen-depto-react">
        <span className="mkt-resumen-depto-numero-react">{campaigns.length}</span>
        <span>{campaigns.length === 1 ? "campaña en marcha" : "campañas en marcha"}</span>
        {pipeline.length > 0 ? (
          <span className="mkt-pipeline-react">
            {pipeline.map(({ estado, total }) => (
              <Badge
                key={estado}
                variant="outline"
                className={`mkt-pipeline-chip-react mkt-pipeline-${estado}-react`}
              >
                {total} {CONTENT_ESTADO_LABEL[estado].toLowerCase()}
              </Badge>
            ))}
          </span>
        ) : null}
      </div>

      <header className="mkt-panel-header-react">
        <p className="mkt-resumen-react">
          {totalPendientes === 0 ? (
            <>Nada pendiente esta semana.</>
          ) : (
            <>
              <strong>{totalPendientes}</strong>{" "}
              {totalPendientes === 1 ? "cosa pendiente" : "cosas pendientes"}
              {vencidas.length > 0 ? (
                <span className="mkt-resumen-alerta-react">
                  , {vencidas.length} ya {vencidas.length === 1 ? "vencida" : "vencidas"}
                </span>
              ) : null}
            </>
          )}
        </p>

        <label className="mkt-toggle-react">
          <input
            type="checkbox"
            checked={soloMias}
            onChange={(event) => setSoloMias(event.target.checked)}
          />
          Solo lo mío
        </label>
      </header>

      {vacio ? (
        <p className="mkt-vacio-react">
          {soloMias
            ? "No tienes nada asignado con fecha próxima. Mira las campañas para coger algo."
            : "Nada con fecha en los próximos días. Buen momento para preparar la siguiente campaña."}
        </p>
      ) : null}

      {vencidas.length > 0 ? (
        <div className="mkt-grupo-react">
          <h4 className="mkt-grupo-titulo-react mkt-grupo-urgente-react">
            Vencidas
            <Badge variant="destructive">{vencidas.length}</Badge>
          </h4>
          <ul className="mkt-filas-react">
            {vencidas.map((task) => (
              <FilaTarea key={task.id} task={task} onHecha={marcarHecha} />
            ))}
          </ul>
        </div>
      ) : null}

      {dias.length > 0 ? (
        <div className="mkt-tl-react">
          {dias.map((dia) => (
            <div
              key={dia.fecha}
              className={`mkt-tl-dia-react${dia.dias === 0 ? " mkt-tl-dia-hoy-react" : ""}${
                dia.publicaciones.length > 0 ? " mkt-tl-dia-hito-react" : ""
              }`}
            >
              <p className="mkt-tl-etiqueta-react">{etiquetaDia(dia.fecha, dia.dias)}</p>

              {dia.publicaciones.map((pub) => (
                <Hito
                  key={pub.id}
                  pub={pub}
                  pendientes={
                    tasks.filter((t) => t.content_id === pub.id && t.estado !== "acabado").length
                  }
                />
              ))}

              {dia.tareas.length > 0 ? (
                <ul className="mkt-filas-react">
                  {dia.tareas.map((task) => (
                    <FilaTarea key={task.id} task={task} onHecha={marcarHecha} />
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {sinFecha.length > 0 ? (
        <div className="mkt-grupo-react">
          <h4 className="mkt-grupo-titulo-react">
            Sin fecha
            <Badge variant="outline">{sinFecha.length}</Badge>
          </h4>
          <ul className="mkt-filas-react">
            {sinFecha.map((task) => (
              <FilaTarea key={task.id} task={task} onHecha={marcarHecha} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
