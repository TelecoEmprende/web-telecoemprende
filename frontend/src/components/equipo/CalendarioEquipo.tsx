import { motion, useReducedMotion } from "motion/react";
import { FormEvent, useMemo, useState, useEffect } from "react";

import {
  createEquipoCalendarioEvento,
  getDirectorioClub,
  getEquipoCalendario,
  getEquipoSession,
  getEventosLuma,
  getMisProyectos,
  getMisTareas,
} from "../../api/equipo";
import { apiDepto } from "../../api/marketing";
import type { Seccion } from "./EquipoSidebar";
import { DeptoProvider } from "./DeptoApi";
import { AvatarResponsable, etiquetaDe } from "./marketing/Avatares";
import { TaskDialog } from "./marketing/TaskDialog";
import { Contador, useEntradaDeFila } from "../movimiento";
import { listarNotas } from "../../api/notas";
import type { NotaResumen } from "../../types/notas";
import { DURATION, EASE_OUT } from "@/components/smoothui/lib/animation";
import type { ApiFailure } from "../../types/api";
import type { EventoCalendario, EventoLuma, MiembroDirectorio, Team } from "../../types/equipo";
import { textoDe, type Registro } from "../../types/registros";
import {
  diasHasta,
  formatearFecha as formatearFechaCorta,
  type ProyectoResumen,
  type Task,
} from "../../types/marketing";

const DEPTO_LABEL: Record<string, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

/** Cada departamento con su cajita: Tech en azul, Marketing en ámbar y
 *  Eventos en el gris neutro del boceto -- tres tonos que se distinguen de un
 *  vistazo sin que ninguna fila se convierta en un semáforo. */
const DEPTO_TAG: Record<string, string> = {
  ingenieria: "crm-tag-azul-react",
  marketing: "crm-tag-ambar-react",
  eventos: "",
};

/** El Slack del club. Es el mismo para todo el mundo (invitación abierta),
 *  así que vive aquí y no en la ficha de cada persona. */
const SLACK_CLUB =
  "https://join.slack.com/t/telecoemprende/shared_invite/zt-492kyuq78-CJ~sB7TN5xz_j11xj1nnAw";

/** Por qué le escribes a esta persona: primero su VP-azgo en TUS
 *  departamentos, que es lo que la hace tu referente; la presidencia, si no
 *  es VP de ninguno tuyo. */
function papelDe(persona: MiembroDirectorio, teams: Team[]) {
  const mios = persona.vp_de.filter((t) => teams.includes(t));
  if (mios.length > 0) return `VP de ${mios.map((t) => DEPTO_LABEL[t] ?? t).join(" + ")}`;
  if (persona.cargo === "presidente") return "Presidencia del club";
  if (persona.vp_de.length > 0) {
    return `VP de ${persona.vp_de.map((t) => DEPTO_LABEL[t] ?? t).join(" + ")}`;
  }
  return "Board";
}

/** "Ayer" / "Hoy" / "Mañana", y a partir de ahí el día corto ("vie") -- para
 *  no decir siempre "9 sept" cuando "mañana" se lee más rápido. */
function cuandoTarea(deadline: string | null) {
  const dias = diasHasta(deadline);
  if (dias === null) return "Sin fecha";
  if (dias < 0) return dias === -1 ? "Ayer" : `Hace ${Math.abs(dias)} días`;
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias < 7) return DIAS[(parsearFechaLocal(deadline as string).getDay() + 6) % 7];
  return formatearFechaCorta(deadline);
}

/** "Buenos días"/"Buenas tardes"/"Buenas noches", según la hora local. */
function saludoDeAhora() {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** "Hace 2h" / "Hace 3 días", para el aviso del board -- una fecha exacta ahí
 *  no dice nada de si es reciente o lleva semanas colgado. */
function haceTiempo(iso: string) {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 60) return minutos <= 1 ? "Hace un momento" : `Hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Hace ${horas}h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "Hace 1 día" : `Hace ${dias} días`;
}

/** Lunes de la semana de `fecha`, para la rejilla de "esta semana". */
function celdasDeLaSemana(fecha: Date) {
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return dia;
  });
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
/** La rejilla de la semana va con una sola letra, como en el boceto: "L 13". */
const DIAS_LETRA = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function iso(fecha: Date) {
  // toISOString() pasa por UTC y en España adelanta/atrasa un día según la
  // hora; construir la cadena a mano evita ese desfase.
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function parsearFechaLocal(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

/** "12 al 18 de octubre" (o "28 sep al 4 oct" si la semana cruza de mes). */
function rangoSemana(lunes: Date, domingo: Date) {
  if (lunes.getMonth() === domingo.getMonth()) {
    return `${lunes.getDate()} al ${domingo.getDate()} de ${MESES[lunes.getMonth()]}`;
  }
  return `${lunes.getDate()} de ${MESES[lunes.getMonth()].slice(0, 3)} al ` +
    `${domingo.getDate()} de ${MESES[domingo.getMonth()].slice(0, 3)}`;
}

/**
 * Inicio del club: "Mi semana", la única pantalla que se abre a diario.
 *
 * Sigue el boceto de alta fidelidad (pantalla 2a) pieza a pieza: cabecera con
 * saludo y dos acciones, aviso del board, y dos columnas de cajas -- tareas
 * de la semana con casilla, rejilla de siete días, proyectos con su barra a
 * la izquierda; próximos eventos y a quién escribir a la derecha.
 */
type Props = {
  /** Cambiar de sección del workspace (Avisos, Calendario, Tareas...), para
   *  los atajos de la cabecera y el enlace del aviso del board. */
  onIrA: (seccion: Seccion) => void;
  /** Abrir una nota concreta en "Notas". */
  onAbrirNota?: (id: number) => void;
};

export function CalendarioEquipo({ onIrA, onAbrirNota }: Props) {
  const menosMovimiento = useReducedMotion();
  const entradaFila = useEntradaDeFila();
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [tareas, setTareas] = useState<Task[]>([]);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [vpDe, setVpDe] = useState<string[]>([]);
  const [cargo, setCargo] = useState("");
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [tareaAbierta, setTareaAbierta] = useState<Task | null>(null);
  const [mostrarFormularioEvento, setMostrarFormularioEvento] = useState(false);
  const [eventoForm, setEventoForm] = useState({ titulo: "", descripcion: "", fecha: "", hora: "" });
  const [creandoEvento, setCreandoEvento] = useState(false);
  const [errorEvento, setErrorEvento] = useState<string | null>(null);
  const puedeAnadirEvento = vpDe.length > 0;
  // "Asignadas a mí" filtra por responsable; "Mis departamentos" (por
  // defecto) es lo de siempre: todo lo abierto de los departamentos propios.
  const [filtroTareas, setFiltroTareas] = useState<"mias" | "departamentos">("departamentos");
  const [anuncio, setAnuncio] = useState<Registro | null>(null);
  const [directorio, setDirectorio] = useState<MiembroDirectorio[]>([]);
  const [marcandoHecha, setMarcandoHecha] = useState<number | null>(null);
  const [notas, setNotas] = useState<NotaResumen[]>([]);
  const [luma, setLuma] = useState<{ calendario: string; eventos: EventoLuma[] }>({
    calendario: "",
    eventos: [],
  });

  async function cargarCalendario() {
    try {
      const response = await getEquipoCalendario();
      if (response.ok) setEventos(response.eventos);
    } catch {
      // Sin calendario disponible: la sección se queda con su estado vacío.
    }
  }

  async function cargarTareas() {
    try {
      const respuesta = await getMisTareas();
      setTareas(respuesta.tareas);
    } catch {
      // Sin agenda disponible: la sección no aparece, sin más.
    }
  }

  useEffect(() => {
    let active = true;

    void cargarCalendario();
    getEventosLuma()
      .then((r) => {
        if (active && r.ok) setLuma({ calendario: r.calendario, eventos: r.eventos });
      })
      .catch(() => {
        // Sin Luma, la caja enseña solo los eventos del club.
      });
    listarNotas()
      .then((r) => {
        if (active && r.ok) setNotas(r.notas);
      })
      .catch(() => {
        // Sin notas: la caja se queda en su estado vacío.
      });

    getEquipoSession()
      .then((sesion) => {
        if (!active) return;
        setNombre(sesion.nombre);
        setEmail(sesion.email);
        setTeams(sesion.teams);
        setVpDe(sesion.vp_de);
        setCargo(sesion.cargo);
        // Tareas abiertas de cualquier departamento al que pertenezca -- con
        // uno solo es lo mismo que ve en el resumen de ese departamento, pero
        // repetirlo aquí es gratis y evita el salto raro de "aparece según
        // cuántos equipos tengas".
        void cargarTareas();

        getMisProyectos()
          .then((respuesta) => {
            if (active) setProyectos(respuesta.proyectos);
          })
          .catch(() => {
            // Sin proyectos disponibles: la sección no aparece, sin más.
          });

        // Los anuncios son del club entero pero se piden por la ruta de un
        // departamento (el backend no los acota); da igual cuál mientras la
        // persona pertenezca a él. Ya vienen ordenados fijado > recientes.
        if (sesion.teams.length > 0) {
          apiDepto(sesion.teams[0])
            .listarRegistros("anuncios")
            .then((respuesta) => {
              if (active) setAnuncio(respuesta.anuncios[0] ?? null);
            })
            .catch(() => {
              // Sin anuncios disponibles: el banner no aparece, sin más.
            });
        }
      })
      .catch(() => {
        // Sin sesión legible no hay nombre que saludar ni agenda que pedir.
      });

    getDirectorioClub()
      .then((respuesta) => {
        if (active) setDirectorio(respuesta.miembros);
      })
      .catch(() => {
        // Sin directorio disponible: los contactos no aparecen, sin más.
      });

    return () => {
      active = false;
    };
  }, []);

  const tareasVisibles = useMemo(
    () =>
      filtroTareas === "mias"
        ? tareas.filter((t) => t.responsables.includes(email))
        : tareas,
    [tareas, filtroTareas, email],
  );

  /** A quién escribir cuando te atascas: el VP de cada departamento tuyo y la
   *  presidencia del club. Ocupa el sitio del "Quién es quién" del boceto --
   *  el directorio entero ya está en Miembros; lo que falta aquí es saber a
   *  quién preguntar y por dónde. */
  const contactos = useMemo(() => {
    const vps = directorio.filter(
      (m) => m.email !== email && teams.some((t) => m.vp_de.includes(t)),
    );
    const presidencia = directorio.filter(
      (m) =>
        m.email !== email &&
        m.cargo === "presidente" &&
        !vps.some((vp) => vp.email === m.email),
    );
    return [...vps, ...presidencia];
  }, [directorio, teams, email]);

  /** Marcar hecha desde la casilla, sin abrir el diálogo -- para eso está la
   *  casilla en el boceto. Vuelve a "pendiente" si se desmarca. */
  async function alternarHecha(tarea: Task) {
    setMarcandoHecha(tarea.id);
    const nuevoEstado = tarea.estado === "acabado" ? "pendiente" : "acabado";
    try {
      await apiDepto(tarea.departamento as Team).updateTask(tarea.id, { estado: nuevoEstado });
      await cargarTareas();
    } catch {
      // Sin marcar, la tarea se queda como estaba -- no bloquea el resto.
    } finally {
      setMarcandoHecha(null);
    }
  }

  async function crearEvento(event: FormEvent) {
    event.preventDefault();
    setCreandoEvento(true);
    setErrorEvento(null);
    try {
      await createEquipoCalendarioEvento(eventoForm);
      setEventoForm({ titulo: "", descripcion: "", fecha: "", hora: "" });
      setMostrarFormularioEvento(false);
      await cargarCalendario();
    } catch (err) {
      setErrorEvento((err as ApiFailure)?.message || "No se pudo crear el evento.");
    } finally {
      setCreandoEvento(false);
    }
  }

  const porDia = useMemo(
    () =>
      eventos.reduce<Record<string, EventoCalendario[]>>((acc, evento) => {
        (acc[evento.fecha] ??= []).push(evento);
        return acc;
      }, {}),
    [eventos],
  );

  /** Vencimientos de tareas por día, para la rejilla de "esta semana". */
  const tareasPorDia = useMemo(() => {
    const mapa: Record<string, Task[]> = {};
    for (const tarea of tareas) {
      if (!tarea.deadline) continue;
      (mapa[tarea.deadline] ??= []).push(tarea);
    }
    return mapa;
  }, [tareas]);

  const semana = useMemo(() => celdasDeLaSemana(new Date()), []);

  /** Los eventos del club (los que se apuntan desde /admin) y los de Luma,
   *  en una sola lista. Los de Luma traen su página, que es donde la gente se
   *  apunta: ya no hay "Confirmar" dentro del panel. */
  const proximos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const delClub = eventos
      .filter((evento) => parsearFechaLocal(evento.fecha) >= hoy)
      .map((e) => ({
        clave: `club-${e.id}`,
        titulo: e.titulo,
        fecha: e.fecha,
        hora: e.hora,
        detalle: e.descripcion,
        url: "",
      }));
    const deLuma = luma.eventos.map((e) => {
      const inicio = new Date(e.inicio);
      return {
        clave: `luma-${e.id}`,
        titulo: e.titulo,
        fecha: iso(inicio),
        hora: `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`,
        detalle: e.lugar,
        url: e.url || luma.calendario,
      };
    });
    return [...delClub, ...deLuma].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  }, [eventos, luma]);

  const hoy = iso(new Date());

  // Cuántas tareas vencen dentro de la semana en curso (lunes a domingo): es
  // lo que dice la cabecera del boceto, no "todo lo pendiente alguna vez".
  const tareasQueVencenEstaSemana = useMemo(() => {
    const lunes = semana[0];
    const domingo = semana[6];
    return tareas.filter((t) => {
      if (!t.deadline) return false;
      const fecha = parsearFechaLocal(t.deadline);
      return fecha >= lunes && fecha <= domingo;
    }).length;
  }, [tareas, semana]);

  // Lo pendiente del club sale de las notas: cada casilla sin marcar es una
  // cosa por hacer, con la nota de la que viene al lado.
  const notasConPendientes = notas.filter((n) => n.checks_pendientes > 0);
  const totalPendientes = notasConPendientes.reduce((suma, n) => suma + n.checks_pendientes, 0);
  const tareasAbiertas = tareas.filter((t) => t.estado !== "acabado");
  const proximoEvento = proximos[0];
  const diasProximo = proximoEvento ? diasHasta(proximoEvento.fecha) : null;


  return (
    <>
      <section className="inicio-hero-react" aria-labelledby="inicio-saludo">
        <div className="inicio-hero-texto-react">
          <p className="inicio-hero-fecha-react">Semana del {rangoSemana(semana[0], semana[6])}</p>
          <h1 id="inicio-saludo" className="inicio-hero-saludo-react">
            {saludoDeAhora()}{nombre ? `, ${nombre}` : ""}
          </h1>
          <p className="inicio-hero-sub-react">
            {tareasQueVencenEstaSemana === 0
              ? "ninguna tarea vence esta semana"
              : `${tareasQueVencenEstaSemana} ${tareasQueVencenEstaSemana === 1 ? "tarea vence" : "tareas vencen"} esta semana`}
            {totalPendientes > 0
              ? ` · ${totalPendientes} ${totalPendientes === 1 ? "pendiente" : "pendientes"} en las notas`
              : ""}
          </p>
        </div>
        <div className="inicio-hero-acciones-react">
          <button type="button" className="crm-btn" onClick={() => onIrA("tareas")}>
            Nueva tarea
          </button>
          <button type="button" className="inicio-btn-claro-react" onClick={() => onIrA("notas")}>
            Nueva nota
          </button>
          <button type="button" className="inicio-btn-claro-react" onClick={() => onIrA("miembros")}>
            Buscar miembro
          </button>
        </div>
      </section>

      <div className="inicio-kpis-react">
        <button type="button" className="inicio-kpi-react" onClick={() => onIrA("tareas")}>
          <span className="crm-k">Tareas abiertas</span>
          <Contador className="inicio-kpi-num-react" valor={tareasAbiertas.length} />
          <span className="crm-s">en tus departamentos</span>
        </button>
        <button type="button" className="inicio-kpi-react" onClick={() => onIrA("calendario")}>
          <span className="crm-k">Vencen esta semana</span>
          <Contador
            className={`inicio-kpi-num-react${tareasQueVencenEstaSemana > 0 ? " inicio-kpi-alerta-react" : ""}`}
            valor={tareasQueVencenEstaSemana}
          />
          <span className="crm-s">de lunes a domingo</span>
        </button>
        <button type="button" className="inicio-kpi-react" onClick={() => onIrA("notas")}>
          <span className="crm-k">Pendiente en notas</span>
          <Contador className="inicio-kpi-num-react" valor={totalPendientes} />
          <span className="crm-s">
            en {notasConPendientes.length} {notasConPendientes.length === 1 ? "nota" : "notas"}
          </span>
        </button>
        <button type="button" className="inicio-kpi-react" onClick={() => onIrA("calendario")}>
          <span className="crm-k">Próximo evento</span>
          <span className="inicio-kpi-num-react">
            {diasProximo === null ? "—" : diasProximo === 0 ? "Hoy" : `${diasProximo}d`}
          </span>
          <span className="crm-s inicio-kpi-recorte-react">{proximoEvento?.titulo ?? "Nada apuntado"}</span>
        </button>
      </div>

      {anuncio ? (
        <div className="crm-c crm-c-aviso-react">
          <span className="crm-tag crm-tag-azul-react">Aviso del board</span>
          <div className="crm-row-cuerpo-react">
            <div className="crm-t">{textoDe(anuncio, "titulo")}</div>
            <div className="crm-s">
              {[haceTiempo(anuncio.created_at), textoDe(anuncio, "cuerpo")]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <button type="button" className="crm-btn crm-btn-ghost-react" onClick={() => onIrA("anuncios")}>
            Ver anuncios
          </button>
        </div>
      ) : null}

      <div className="inicio-bento-react">
          <section className="crm-c inicio-span-7-react">
            <div className="crm-cabecera-react">
              <p className="crm-k">Mis tareas de la semana</p>
              <div className="crm-tags-react" role="group" aria-label="Filtrar tareas">
                <button
                  type="button"
                  className={`crm-tag${filtroTareas === "mias" ? " crm-tag-azul-react" : ""}`}
                  aria-pressed={filtroTareas === "mias"}
                  onClick={() => setFiltroTareas("mias")}
                >
                  Asignadas a mí
                </button>
                <button
                  type="button"
                  className={`crm-tag${filtroTareas === "departamentos" ? " crm-tag-azul-react" : ""}`}
                  aria-pressed={filtroTareas === "departamentos"}
                  onClick={() => setFiltroTareas("departamentos")}
                >
                  Mis departamentos
                </button>
              </div>
            </div>

            {tareasVisibles.length === 0 ? (
              <p className="crm-s">
                {filtroTareas === "mias"
                  ? "No tienes ninguna tarea asignada ahora mismo."
                  : "Nada pendiente en ningún departamento ahora mismo."}
              </p>
            ) : (
              <div className="inicio-scroll-react">
                {tareasVisibles.map((tarea, indice) => {
                  const otros = tarea.responsables
                    .filter((r) => r !== email)
                    .map((r) => etiquetaDe(r, undefined));
                  const dias = diasHasta(tarea.deadline);
                  const hecha = tarea.estado === "acabado";
                  const vencida = dias !== null && dias < 0 && !hecha;
                  return (
                    <motion.div
                      key={`${tarea.departamento}-${tarea.id}`}
                      className={`crm-row${hecha ? " crm-row-apagada-react" : ""}`}
                      {...entradaFila(indice)}
                    >
                      <input
                        type="checkbox"
                        className="crm-check"
                        checked={hecha}
                        disabled={marcandoHecha === tarea.id}
                        aria-label={`Marcar "${tarea.titulo}" como hecha`}
                        onChange={() => void alternarHecha(tarea)}
                      />
                      <button
                        type="button"
                        className="crm-row-cuerpo-react"
                        onClick={() => setTareaAbierta(tarea)}
                      >
                        <div className={`crm-t${hecha ? " crm-tachado-react" : ""}`}>
                          {tarea.titulo}
                        </div>
                        <div className="crm-s">
                          {hecha
                            ? "Completada"
                            : [
                                tarea.campaign_nombre ? `Proyecto: ${tarea.campaign_nombre}` : null,
                                otros.length > 0 ? `con ${otros.join(", ")}` : null,
                                tarea.instrucciones ? "la tarea incluye instrucciones" : null,
                              ].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                      <span className={`crm-tag ${DEPTO_TAG[tarea.departamento] ?? ""}`}>
                        {DEPTO_LABEL[tarea.departamento] ?? tarea.departamento}
                      </span>
                      {hecha ? (
                        <span className="crm-tag crm-tag-verde-react">Hecho</span>
                      ) : (
                        <span
                          className={`crm-tag${vencida || dias === 0 ? " crm-tag-ambar-react" : ""}`}
                        >
                          {cuandoTarea(tarea.deadline)}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="crm-c inicio-span-5-react">
            <div className="crm-cabecera-react">
              <p className="crm-k">Pendiente en notas</p>
              <button type="button" className="crm-enlace-react" onClick={() => onIrA("notas")}>
                Ver notas
              </button>
            </div>
            {notasConPendientes.length === 0 ? (
              <p className="crm-s">
                Nada pendiente. Las casillas que dejes sin marcar en una nota aparecen aquí.
              </p>
            ) : (
              <div className="inicio-scroll-react">
                {notasConPendientes.slice(0, 4).map((n, indice) => (
                  <motion.div key={n.id} className="inicio-pendientes-react" {...entradaFila(indice)}>
                    <button
                      type="button"
                      className="inicio-pendientes-nota-react"
                      onClick={() => (onAbrirNota ? onAbrirNota(n.id) : onIrA("notas"))}
                    >
                      {n.titulo || "Sin título"}
                      <span>{n.checks_pendientes}</span>
                    </button>
                    <ul>
                      {n.pendientes.slice(0, 3).map((texto, i) => (
                        <li key={i}>{texto}</li>
                      ))}
                      {n.checks_pendientes > 3 ? (
                        <li className="crm-s">y {n.checks_pendientes - 3} más</li>
                      ) : null}
                    </ul>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section className="crm-c inicio-span-7-react">
            <div className="crm-cabecera-react">
              <p className="crm-k">Esta semana</p>
              <button type="button" className="crm-enlace-react" onClick={() => onIrA("calendario")}>
                Ver el mes
              </button>
            </div>

            <div className="crm-semana-react">
              {semana.map((dia, indice) => {
                const clave = iso(dia);
                return (
                  <div
                    key={clave}
                    className={`crm-semana-dia-react${clave === hoy ? " crm-semana-hoy-react" : ""}`}
                  >
                    <div className="crm-s inicio-dia-react">
                      <span>{DIAS_LETRA[indice]}</span> <b>{dia.getDate()}</b>
                    </div>
                    {(porDia[clave] ?? []).map((evento) => (
                      <span
                        key={`ev-${evento.id}`}
                        className="crm-tag crm-tag-bloque-react crm-tag-azul-react"
                      >
                        {evento.titulo}
                        {evento.hora ? ` ${evento.hora}` : ""}
                      </span>
                    ))}
                    {(tareasPorDia[clave] ?? []).map((tarea) => (
                      <span
                        key={`t-${tarea.id}`}
                        className="crm-tag crm-tag-bloque-react crm-tag-ambar-react"
                      >
                        Vence: {tarea.titulo}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="crm-s">
              Eventos del club, reuniones de departamento y vencimientos de tus tareas en la misma rejilla.
            </div>
          </section>

          <section className="crm-c inicio-span-5-react">
            <div className="crm-cabecera-react">
              <p className="crm-k">Próximos eventos</p>
              {luma.calendario ? (
                <a className="crm-enlace-react" href={luma.calendario} target="_blank" rel="noreferrer noopener">
                  Calendario en Luma
                </a>
              ) : null}
              {puedeAnadirEvento ? (
                <button
                  type="button"
                  className="crm-enlace-react"
                  onClick={() => setMostrarFormularioEvento((abierto) => !abierto)}
                >
                  {mostrarFormularioEvento ? "Cancelar" : "+ Evento"}
                </button>
              ) : null}
            </div>

            {mostrarFormularioEvento ? (
              <form className="mkt-form-react" onSubmit={(e) => void crearEvento(e)}>
                {errorEvento ? <p className="mkt-resumen-alerta-react">{errorEvento}</p> : null}
                <div className="field-group-react">
                  <label htmlFor="ce-titulo">Título</label>
                  <input
                    id="ce-titulo"
                    type="text"
                    required
                    maxLength={150}
                    value={eventoForm.titulo}
                    onChange={(e) => setEventoForm((f) => ({ ...f, titulo: e.target.value }))}
                  />
                </div>
                <div className="field-group-react">
                  <label htmlFor="ce-descripcion">Descripción (opcional)</label>
                  <input
                    id="ce-descripcion"
                    type="text"
                    maxLength={500}
                    value={eventoForm.descripcion}
                    onChange={(e) => setEventoForm((f) => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>
                <div className="mkt-form-fila-react">
                  <div className="field-group-react">
                    <label htmlFor="ce-fecha">Fecha</label>
                    <input
                      id="ce-fecha"
                      type="date"
                      required
                      value={eventoForm.fecha}
                      onChange={(e) => setEventoForm((f) => ({ ...f, fecha: e.target.value }))}
                    />
                  </div>
                  <div className="field-group-react">
                    <label htmlFor="ce-hora">Hora (opcional)</label>
                    <input
                      id="ce-hora"
                      type="time"
                      value={eventoForm.hora}
                      onChange={(e) => setEventoForm((f) => ({ ...f, hora: e.target.value }))}
                    />
                  </div>
                </div>
                <button type="submit" className="crm-btn" disabled={creandoEvento}>
                  {creandoEvento ? "Creando..." : "Crear evento"}
                </button>
              </form>
            ) : null}

            {proximos.length === 0 ? (
              <p className="crm-s">
                No hay nada apuntado.{" "}
                {puedeAnadirEvento
                  ? "Añade el primero con el botón de arriba."
                  : "Los eventos del club se añaden desde el panel de administración."}
              </p>
            ) : (
              <div className="inicio-scroll-react">
                {proximos.map((evento, indice) => {
                  const [, mes, dia] = evento.fecha.split("-").map(Number);
                  return (
                    <motion.div key={evento.clave} className="crm-row" {...entradaFila(indice)}>
                      <span className="inicio-fecha-react" aria-hidden="true">
                        <b>{dia}</b>
                        <span>{MESES[mes - 1].slice(0, 3)}</span>
                      </span>
                      <div className="crm-row-cuerpo-react">
                        <div className="crm-t">{evento.titulo}</div>
                        <div className="crm-s inicio-kpi-recorte-react">
                          {[formatearFechaCorta(evento.fecha), evento.hora || null, evento.detalle || null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      {evento.url ? (
                        <a className="crm-tag crm-tag-azul-react" href={evento.url} target="_blank" rel="noreferrer noopener">
                          Apuntarme
                          <span className="sr-only"> a {evento.titulo} en Luma (se abre en otra pestaña)</span>
                        </a>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="crm-c inicio-span-4-react">
            <p className="crm-k">Mis proyectos</p>

            {proyectos.length === 0 ? (
              <p className="crm-s">No tienes tareas en ningún proyecto ahora mismo.</p>
            ) : (
              <div className="crm-pila-react">
                {proyectos.map((proyecto, indice) => {
                  const porcentaje =
                    proyecto.total_tasks === 0
                      ? 0
                      : Math.round((proyecto.tareas_acabadas / proyecto.total_tasks) * 100);
                  return (
                    <motion.div key={proyecto.id} {...entradaFila(indice)}>
                      <div className="crm-cabecera-react">
                        <div className="crm-t">
                          {proyecto.nombre}{" "}
                          <span className="crm-s" style={{ fontWeight: 400 }}>
                            · {DEPTO_LABEL[proyecto.departamento] ?? proyecto.departamento}
                          </span>
                        </div>
                        <div className="crm-s">{porcentaje}%</div>
                      </div>
                      <div className="crm-bar" style={{ marginTop: 7 }} aria-hidden="true">
                        <motion.i
                          initial={{ transform: "scaleX(0)" }}
                          animate={{ transform: `scaleX(${porcentaje / 100})` }}
                          transition={
                            menosMovimiento
                              ? { duration: 0 }
                              : { duration: DURATION.slow, ease: EASE_OUT }
                          }
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="crm-c inicio-span-4-react">
            <div className="crm-cabecera-react">
              <p className="crm-k">Notas</p>
              <button type="button" className="crm-enlace-react" onClick={() => onIrA("notas")}>
                Ver todas
              </button>
            </div>
            {notas.length === 0 ? (
              <p className="crm-s">Sin notas todavía. Actas, lluvias de ideas, listas de lo que falta: todo cabe en una nota.</p>
            ) : (
              <div>
                {notas.slice(0, 4).map((n, indice) => (
                  <motion.div key={n.id} className="crm-row" {...entradaFila(indice)}>
                    <button
                      type="button"
                      className="crm-row-cuerpo-react"
                      onClick={() => (onAbrirNota ? onAbrirNota(n.id) : onIrA("notas"))}
                    >
                      <div className="crm-t">{n.titulo || "Sin título"}</div>
                      <div className="crm-s inicio-recorte-react">{n.resumen || haceTiempo(n.updated_at)}</div>
                    </button>
                    {n.checks_pendientes > 0 ? (
                      <span className="crm-tag crm-tag-ambar-react">{n.checks_pendientes} por hacer</span>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {contactos.length > 0 ? (
            <section className="crm-c crm-c-oscura-react inicio-span-4-react">
              <p className="crm-k">A quién escribir</p>

              <div>
                {contactos.map((persona) => (
                  <div key={persona.email} className="crm-row">
                    <AvatarResponsable
                      email={persona.email}
                      nombre={persona.nombre}
                      className="crm-av"
                    />
                    <div className="crm-row-cuerpo-react">
                      <div className="crm-t">{etiquetaDe(persona.email, persona.nombre)}</div>
                      <div className="crm-s">{papelDe(persona, teams)}</div>
                    </div>
                    <span className="crm-tags-react">
                      <a
                        className="crm-tag"
                        href={SLACK_CLUB}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Slack
                      </a>
                      <a className="crm-tag" href={`mailto:${persona.email}`}>
                        Email
                      </a>
                    </span>
                  </div>
                ))}
              </div>

              <div className="crm-s">
                Escríbeles por el Slack del club o por correo si te atascas con algo.
              </div>
            </section>
          ) : null}
      </div>

      {tareaAbierta ? (
        <DeptoProvider value={tareaAbierta.departamento as Team}>
          <TaskDialog
            task={tareaAbierta}
            puedeAsignar={cargo === "presidente" || cargo === "boardmember" || vpDe.includes(tareaAbierta.departamento)}
            onCerrar={() => setTareaAbierta(null)}
            onGuardado={async () => {
              setTareaAbierta(null);
              await cargarTareas();
            }}
          />
        </DeptoProvider>
      ) : null}
    </>
  );
}
