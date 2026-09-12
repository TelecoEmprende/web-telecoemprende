import { FormEvent, useMemo, useState, useEffect } from "react";

import {
  createEquipoCalendarioEvento,
  getEquipoCalendario,
  getEquipoSession,
  getMisTareas,
} from "../../api/equipo";
import { DeptoProvider } from "./DeptoApi";
import { TaskDialog } from "./marketing/TaskDialog";
import type { ApiFailure } from "../../types/api";
import type { EventoCalendario, Team } from "../../types/equipo";
import { diasHasta, formatearFecha as formatearFechaCorta, type Task } from "../../types/marketing";

const DEPTO_LABEL: Record<string, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

/** Color por departamento: el hilo visual de la agenda en vez de repetir la
 *  etiqueta en cada fila. */
const DEPTO_CLASE: Record<string, string> = {
  marketing: "mkt-agenda-marketing-react",
  eventos: "mkt-agenda-eventos-react",
  ingenieria: "mkt-agenda-ingenieria-react",
};

/** "Ayer" / "Hoy" / "Mañana", y a partir de ahí la fecha -- para no decir
 *  siempre "9 sept" cuando "mañana" se lee más rápido. */
function cuandoTarea(deadline: string | null) {
  const dias = diasHasta(deadline);
  if (dias === null) return "Sin fecha";
  if (dias < 0) return dias === -1 ? "Ayer" : `Hace ${Math.abs(dias)} días`;
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return formatearFechaCorta(deadline);
}

/** "Martes 8 de septiembre", con mayúscula inicial -- toLocaleDateString la
 *  da en minúscula. */
function tituloDeHoy() {
  const texto = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Lunes de la semana de `fecha`, para la tira de "esta semana" encima de
 *  la agenda -- los 7 días siempre, sin huecos de mes que rellenar. */
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
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Cuántos eventos caben en una celda antes de plegar el resto. */
const MAX_POR_DIA = 3;

function iso(fecha: Date) {
  // toISOString() pasa por UTC y en España adelanta/atrasa un día según la
  // hora; construir la cadena a mano evita ese desfase.
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Días del mes precedidos por los huecos necesarios para que el 1 caiga en su
 *  columna. Semana que empieza en lunes, como el calendario de aquí. */
function celdasDelMes(anio: number, mes: number) {
  const primero = new Date(anio, mes, 1);
  const huecos = (primero.getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => new Date(anio, mes, i + 1)),
  ];
}

function parsearFechaLocal(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFecha(fecha: string) {
  return parsearFechaLocal(fecha).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Inicio del club: el calendario compartido y lo que viene.
 *
 * Es la sección con la que abre `/equipo`, común a todo el mundo -- las de
 * cada departamento cuelgan debajo en el sidebar.
 *
 * La rejilla es la misma que la del calendario de Marketing: reutiliza sus
 * clases `mkt-*` (`marketing.css`) en vez de duplicar el diseño con otro
 * prefijo, así que un retoque a esa rejilla se ve en los dos sitios. Aquí es
 * solo lectura -- los eventos del club se crean desde `/admin` --, así que no
 * hay ni "+" en el día ni formulario: solo lo que `equipo.css` neutraliza del
 * estilo de botón que traen esas clases.
 */
export function CalendarioEquipo() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [cursor, setCursor] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [tareas, setTareas] = useState<Task[]>([]);
  const [nombre, setNombre] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [vpDe, setVpDe] = useState<string[]>([]);
  const [tareaAbierta, setTareaAbierta] = useState<Task | null>(null);
  const [mostrarFormularioEvento, setMostrarFormularioEvento] = useState(false);
  const [eventoForm, setEventoForm] = useState({ titulo: "", descripcion: "", fecha: "", hora: "" });
  const [creandoEvento, setCreandoEvento] = useState(false);
  const [errorEvento, setErrorEvento] = useState<string | null>(null);
  const puedeAnadirEvento = vpDe.length > 0;

  async function cargarCalendario() {
    try {
      const response = await getEquipoCalendario();
      if (response.ok) setEventos(response.eventos);
    } catch {
      // Sin calendario disponible: la sección se queda con su estado vacío.
    }
  }

  useEffect(() => {
    let active = true;

    void cargarCalendario();

    getEquipoSession()
      .then((sesion) => {
        if (!active) return;
        setNombre(sesion.nombre);
        setTeams(sesion.teams);
        setVpDe(sesion.vp_de);
        // Tareas abiertas de cualquier departamento al que pertenezca -- con
        // uno solo es lo mismo que ve en el resumen de ese departamento, pero
        // repetirlo aquí es gratis y evita el salto raro de "aparece según
        // cuántos equipos tengas".
        getMisTareas()
          .then((respuesta) => {
            if (active) setTareas(respuesta.tareas);
          })
          .catch(() => {
            // Sin agenda disponible: la sección no aparece, sin más.
          });
      })
      .catch(() => {
        // Sin sesión legible no hay nombre que saludar ni agenda que pedir.
      });

    return () => {
      active = false;
    };
  }, []);

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

  /** Qué departamentos tienen una tarea que vence cada día, para los
   *  puntitos de color de la tira de la semana. */
  const deptosPorDia = useMemo(() => {
    const mapa: Record<string, Set<string>> = {};
    for (const tarea of tareas) {
      if (!tarea.deadline) continue;
      (mapa[tarea.deadline] ??= new Set()).add(tarea.departamento);
    }
    return mapa;
  }, [tareas]);

  const semana = useMemo(() => celdasDeLaSemana(new Date()), []);

  const proximos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return eventos
      .filter((evento) => parsearFechaLocal(evento.fecha) >= hoy)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  }, [eventos]);

  const hoy = iso(new Date());

  // Todo lo abierto con fecha, no solo hoy/mañana: contar nada más lo próximo
  // dejaba "ninguna cosa pendiente" a quien tenía tareas ya vencidas la
  // semana pasada -- se lee como "vas al día" y es lo contrario. Mismo
  // criterio que el resumen de cada departamento (`WeekPanel.totalPendientes`).
  const cosasPorDelante = tareas.filter((t) => diasHasta(t.deadline) !== null).length;

  function mover(meses: number) {
    setCursor((actual) => new Date(actual.getFullYear(), actual.getMonth() + meses, 1));
  }

  function irAHoy() {
    const ahora = new Date();
    setCursor(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  }

  const calendario = (
    <section className="mkt-panel-react">
      <header className="mkt-panel-header-react">
        <h3>
          {MESES[cursor.getMonth()]} {cursor.getFullYear()}
        </h3>
        <div className="mkt-calendario-nav-react">
          <button type="button" className="mkt-btn-mini-react" onClick={() => mover(-1)}>
            ← Anterior
          </button>
          <button type="button" className="mkt-btn-mini-react" onClick={irAHoy}>
            Hoy
          </button>
          <button type="button" className="mkt-btn-mini-react" onClick={() => mover(1)}>
            Siguiente →
          </button>
        </div>
      </header>

      <div className="mkt-calendario-react">
        {DIAS.map((dia) => (
          <div key={dia} className="mkt-calendario-cabecera-react">
            {dia}
          </div>
        ))}

        {celdasDelMes(cursor.getFullYear(), cursor.getMonth()).map((fecha, indice) => {
          if (fecha === null) {
            return <div key={`hueco-${indice}`} className="mkt-dia-vacio-react" />;
          }

          const clave = iso(fecha);
          const delDia = porDia[clave] ?? [];
          const visibles = delDia.slice(0, MAX_POR_DIA);
          const ocultos = delDia.length - visibles.length;

          return (
            <div
              key={clave}
              className={`mkt-dia-react${clave === hoy ? " mkt-dia-hoy-react" : ""}`}
            >
              <span className="mkt-dia-numero-react">{fecha.getDate()}</span>

              {visibles.map((evento) => (
                <span
                  key={evento.id}
                  className="mkt-evento-react equipo-evento-chip-react"
                  title={`${evento.titulo}${evento.hora ? ` · ${evento.hora}` : ""}`}
                >
                  {evento.hora ? `${evento.hora} ` : ""}
                  {evento.titulo}
                </span>
              ))}

              {ocultos > 0 ? (
                <span className="mkt-dia-mas-eventos-react">+{ocultos} más</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );

  const proximosEventos = (
    <section className="equipo-proximos-react">
      <header className="equipo-panel-header-react">
        <h3>Próximos eventos</h3>
        {puedeAnadirEvento ? (
          <button
            type="button"
            className={mostrarFormularioEvento ? "mkt-btn-mini-react" : "mkt-btn-react"}
            onClick={() => setMostrarFormularioEvento((abierto) => !abierto)}
          >
            {mostrarFormularioEvento ? "Cancelar" : "+ Evento"}
          </button>
        ) : null}
      </header>

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
          <button type="submit" className="mkt-btn-react" disabled={creandoEvento}>
            {creandoEvento ? "Creando..." : "Crear evento"}
          </button>
        </form>
      ) : null}

      {proximos.length === 0 ? (
        <p className="equipo-vacio-react">
          No hay nada apuntado.{" "}
          {puedeAnadirEvento
            ? "Añade el primero con el botón de arriba."
            : "Los eventos del club se añaden desde el panel de administración."}
        </p>
      ) : (
        <ul className="equipo-eventos-lista-react">
          {proximos.map((evento) => (
            <li key={evento.id} className="equipo-evento-react">
              <span className="equipo-evento-fecha-react">
                {formatearFecha(evento.fecha)}
                {evento.hora ? ` · ${evento.hora}` : ""}
              </span>
              <span className="equipo-evento-titulo-react">{evento.titulo}</span>
              {evento.descripcion ? (
                <span className="equipo-evento-desc-react">{evento.descripcion}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <header className="mkt-saludo-react">
        <h3>Hola{nombre ? `, ${nombre}` : ""} 👋</h3>
        <p className="mkt-meta-react">
          {tituloDeHoy()} —{" "}
          {cosasPorDelante === 0
            ? "ninguna cosa pendiente"
            : `${cosasPorDelante} ${cosasPorDelante === 1 ? "cosa pendiente" : "cosas pendientes"}`}
        </p>
      </header>

      <div className="mkt-semana-tira-react">
        {semana.map((dia) => {
          const clave = iso(dia);
          const deptos = [...(deptosPorDia[clave] ?? [])];
          const hayEvento = (porDia[clave] ?? []).length > 0;
          return (
            <div
              key={clave}
              className={`mkt-semana-dia-react${clave === hoy ? " mkt-semana-dia-hoy-react" : ""}`}
            >
              <span className="mkt-semana-letra-react">{DIAS[(dia.getDay() + 6) % 7]}</span>
              <span className="mkt-semana-numero-react">{dia.getDate()}</span>
              <span className="mkt-semana-puntos-react">
                {deptos.map((depto) => (
                  <i key={depto} className={`mkt-semana-punto-react ${DEPTO_CLASE[depto] ?? ""}`} />
                ))}
                {hayEvento ? <i className="mkt-semana-punto-react mkt-semana-punto-club-react" /> : null}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mkt-inicio-columnas-react">
        <section className="mkt-panel-react mkt-agenda-panel-react">
          <header className="mkt-panel-header-react">
            <h3>Tu agenda</h3>
            <span className="mkt-meta-react">
              {teams.map((t) => DEPTO_LABEL[t] ?? t).join(" + ")}
            </span>
          </header>

          {tareas.length === 0 ? (
            <p className="mkt-vacio-react">
              Nada pendiente en ningún departamento ahora mismo.
            </p>
          ) : (
            <ul className="mkt-agenda-react">
              {tareas.map((tarea) => {
                const dias = diasHasta(tarea.deadline);
                const vencida = dias !== null && dias < 0;
                return (
                  <li
                    key={`${tarea.departamento}-${tarea.id}`}
                    className={`mkt-agenda-item-react ${DEPTO_CLASE[tarea.departamento] ?? ""}`}
                  >
                    <button
                      type="button"
                      className="mkt-agenda-abrir-react"
                      onClick={() => setTareaAbierta(tarea)}
                    >
                      <span
                        className={`mkt-agenda-cuando-react${vencida ? " mkt-agenda-vencida-react" : ""}`}
                      >
                        {cuandoTarea(tarea.deadline)}
                      </span>
                      <span className="mkt-agenda-titulo-react">{tarea.titulo}</span>
                      <span className="mkt-meta-react">
                        {DEPTO_LABEL[tarea.departamento] ?? tarea.departamento}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {tareas.length > 0 ? (
            <div className="mkt-agenda-leyenda-react">
              {[...new Set(tareas.map((t) => t.departamento))].map((depto) => (
                <span key={depto} className={`mkt-agenda-leyenda-punto-react ${DEPTO_CLASE[depto] ?? ""}`}>
                  {DEPTO_LABEL[depto] ?? depto}
                </span>
              ))}
              <span className="mkt-agenda-leyenda-punto-react mkt-agenda-leyenda-vencida-react">
                Vencida
              </span>
            </div>
          ) : null}
        </section>

        <div className="mkt-inicio-lateral-react">
          {calendario}
          {proximosEventos}
        </div>
      </div>

      {tareaAbierta ? (
        <DeptoProvider value={tareaAbierta.departamento as Team}>
          <TaskDialog
            task={tareaAbierta}
            onCerrar={() => setTareaAbierta(null)}
            onGuardado={async () => {
              setTareaAbierta(null);
              const respuesta = await getMisTareas();
              setTareas(respuesta.tareas);
            }}
          />
        </DeptoProvider>
      ) : null}
    </>
  );
}
