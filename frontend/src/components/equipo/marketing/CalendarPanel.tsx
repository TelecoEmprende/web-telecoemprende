import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { useDirectorio } from "../DeptoApi";
import { apiDepto } from "../../../api/marketing";
import { getCalendarioEquipo } from "../../../api/equipo";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { AvataresDeResponsables } from "./Avatares";
import type { ApiFailure } from "../../../types/api";
import type { CalendarioItem } from "../../../types/marketing";
import type { Team } from "../../../types/equipo";

const TODOS_LOS_DEPARTAMENTOS: Team[] = ["marketing", "eventos", "ingenieria"];
const DEPTO_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};
/** Mismas clases que usa el color por departamento en `CalendarioEquipo.tsx`
 *  (`marketing.css`), reutilizadas aquí para el acento del evento. */
const DEPTO_CLASE: Record<string, string> = {
  marketing: "mkt-agenda-marketing-react",
  eventos: "mkt-agenda-eventos-react",
  ingenieria: "mkt-agenda-ingenieria-react",
};

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Cuántos elementos caben en una celda antes de plegar el resto (vista mes). */
const MAX_POR_DIA = 3;

/** El día entero, de 00:00 a 24:00 -- nada que tenga una hora puesta debería
 *  poder "no caber" en la rejilla. La franja se ve entera haciendo scroll
 *  dentro de `.mkt-semana-scroll-react`, que abre centrada sobre el horario
 *  habitual (ver `HORA_SCROLL_INICIAL`) en vez de arrancar en medianoche. */
const HORA_INICIO = 0;
const HORA_FIN = 24;
const HORAS_VISIBLES = Array.from(
  { length: HORA_FIN - HORA_INICIO },
  (_, i) => HORA_INICIO + i,
);
/** A qué hora se abre el scroll de la semana: nadie entra a mirar la
 *  medianoche primero. */
const HORA_SCROLL_INICIAL = 7;

function iso(fecha: Date) {
  // toISOString() pasa por UTC y en España adelanta/atrasa un día según la
  // hora; construir la cadena a mano evita ese desfase.
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Días del mes precedidos por los huecos necesarios para que el 1 caiga en su
 *  columna. Semana que empieza en lunes, como el calendario de aquí. */
function celdasDelMes(año: number, mes: number) {
  const primero = new Date(año, mes, 1);
  const huecos = (primero.getDay() + 6) % 7;
  const diasEnMes = new Date(año, mes + 1, 0).getDate();

  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => new Date(año, mes, i + 1)),
  ];
}

/** Lunes de la semana de `fecha`. */
function lunesDe(fecha: Date) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() - ((copia.getDay() + 6) % 7));
  return copia;
}

/** Los 7 días de la semana de `fecha`, de lunes a domingo -- nunca hace falta
 *  rellenar huecos, a diferencia del mes. */
function celdasDeLaSemana(fecha: Date) {
  const lunes = lunesDe(fecha);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return dia;
  });
}

type Vista = "mes" | "semana";

/** Qué rango de fechas hay que pedirle al backend para la vista actual. */
function rangoDeVista(referencia: Date, vista: Vista) {
  if (vista === "semana") {
    const desde = lunesDe(referencia);
    const hasta = new Date(desde);
    hasta.setDate(desde.getDate() + 6);
    return { desde, hasta };
  }
  const año = referencia.getFullYear();
  const mes = referencia.getMonth();
  return { desde: new Date(año, mes, 1), hasta: new Date(año, mes + 1, 0) };
}

/** Minutos desde medianoche de un "HH:MM", o null si no es una hora válida. */
function minutosDeHora(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora);
  if (!m) return null;
  const minutos = Number(m[1]) * 60 + Number(m[2]);
  return Number.isNaN(minutos) ? null : minutos;
}

const VENTANA_INICIO = HORA_INICIO * 60;
const VENTANA_FIN = HORA_FIN * 60;
const VENTANA_TOTAL = VENTANA_FIN - VENTANA_INICIO;
/** Duración por defecto de un item con hora: ni tareas ni reuniones guardan
 *  cuánto duran, solo cuándo empiezan, así que se pinta un bloque de una
 *  hora -- suficiente para verlo a su sitio sin fingir un dato que no hay. */
const DURACION_DEFECTO_MIN = 60;

type Posicion = { top: number; alto: number; inicioMin: number; finMin: number };

/** Dónde cae un item con hora dentro de la rejilla, en porcentaje de la
 *  ventana visible. Fuera de la ventana se recorta al borde más cercano en
 *  vez de desaparecer: mejor verlo pegado a las 22:00 que no verlo. */
function posicionEnRejilla(hora: string): Posicion | null {
  const minutos = minutosDeHora(hora);
  if (minutos === null) return null;
  const inicio = Math.min(Math.max(minutos, VENTANA_INICIO), VENTANA_FIN - 15);
  const fin = Math.min(inicio + DURACION_DEFECTO_MIN, VENTANA_FIN);
  return {
    top: ((inicio - VENTANA_INICIO) / VENTANA_TOTAL) * 100,
    alto: ((fin - inicio) / VENTANA_TOTAL) * 100,
    inicioMin: inicio,
    finMin: fin,
  };
}

type Bloque = { item: CalendarioItem; pos: Posicion; columna: number; columnas: number };

/** Reparte los items que se solapan en columnas lado a lado, como hace
 *  Google Calendar. Barrido simple por orden de inicio: cada bloque entra en
 *  la primera columna cuyo último bloque ya haya terminado, o abre una
 *  columna nueva. No es óptimo (no reagrupa para minimizar columnas), pero
 *  con el volumen de un club esto no se nota y es mucho menos código.
 */
function distribuirColumnas(items: { item: CalendarioItem; pos: Posicion }[]): Bloque[] {
  const ordenados = [...items].sort((a, b) => a.pos.inicioMin - b.pos.inicioMin);
  const columnas: Posicion[][] = [];
  const columnaDe: number[] = [];

  ordenados.forEach(({ pos }, indice) => {
    let col = columnas.findIndex((c) => c[c.length - 1].finMin <= pos.inicioMin);
    if (col === -1) {
      col = columnas.length;
      columnas.push([]);
    }
    columnas[col].push(pos);
    columnaDe[indice] = col;
  });

  const total = columnas.length || 1;
  return ordenados.map(({ item, pos }, indice) => ({
    item,
    pos,
    columna: columnaDe[indice],
    columnas: total,
  }));
}

type Props = {
  /** Departamentos de la persona que ha iniciado sesión. El calendario es
   *  uno solo para todo el mundo: esto decide qué ve "solo lo mío" y a qué
   *  departamentos puede darse de alta una tarea nueva. */
  teams: Team[];
  /** Abrir la campaña de un elemento del calendario, para que no sea un
   *  callejón sin salida: se ve algo, se toca, se llega a ello. El
   *  departamento va aparte porque puede ser distinto del de quien mira
   *  (ver más abajo, `esDeUnDeptoPropio`). */
  onAbrirCampaign: (campaignId: number, departamento: Team) => void;
};

export function CalendarPanel({ teams, onAbrirCampaign }: Props) {
  const directorio = useDirectorio();
  // A qué departamento se da de alta una tarea nueva: si la persona está en
  // uno solo no hay nada que elegir; si está en varios, un desplegable lo
  // deja explícito en vez de adivinar (ver formularioNuevaTarea).
  const [deptoNuevaTarea, setDeptoNuevaTarea] = useState<Team>(teams[0]);

  const [cursor, setCursor] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [vista, setVista] = useState<Vista>("mes");
  const [items, setItems] = useState<CalendarioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Lectura cruzada por defecto: se ve lo de los tres departamentos, con un
  // filtro encima para acotar a los que interesen (ver respuesta del equipo
  // a "¿abro visibilidad entre departamentos?").
  const [todosDepartamentos, setTodosDepartamentos] = useState(true);
  const [deptosFiltro, setDeptosFiltro] = useState<Team[]>(TODOS_LOS_DEPARTAMENTOS);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const [tituloNuevo, setTituloNuevo] = useState("");
  // Se busca un mes con datos una sola vez, en el primer montaje. Después el
  // usuario manda: si navega a un mes vacío, se queda ahí.
  const [yaBuscado, setYaBuscado] = useState(false);
  const scrollSemanaRef = useRef<HTMLDivElement>(null);

  // Al entrar en la vista semana, la rejilla abre con las 24h de scroll ya
  // colocado sobre el horario habitual en vez de en medianoche.
  useEffect(() => {
    if (vista !== "semana" || isLoading) return;
    const contenedor = scrollSemanaRef.current;
    if (!contenedor) return;
    contenedor.scrollTop = (HORA_SCROLL_INICIAL / (HORA_FIN - HORA_INICIO)) * contenedor.scrollHeight;
  }, [vista, isLoading]);

  const cargar = useCallback(async (referencia: Date) => {
    setIsLoading(true);
    const { desde, hasta } = rangoDeVista(referencia, vista);

    try {
      // "Solo lo mío" ya no significa "el departamento desde el que entré"
      // (ahora hay un único calendario) sino "los departamentos a los que
      // pertenezco" -- para alguien en más de uno, los ve todos igual.
      const respuesta = todosDepartamentos
        ? await getCalendarioEquipo(iso(desde), iso(hasta), deptosFiltro)
        : await getCalendarioEquipo(iso(desde), iso(hasta), teams);
      setItems(respuesta.items);
      setError(null);
      return respuesta.items;
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo cargar el calendario.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [vista, todosDepartamentos, deptosFiltro, teams]);

  useEffect(() => {
    let activo = true;

    async function inicial() {
      // Una sola consulta de tres meses en vez de una por mes: abrir en un mes
      // en blanco sin ninguna pista se lee como "esto está roto", pero buscarlo
      // mes a mes eran cuatro peticiones para pintar una rejilla.
      const desde = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const hasta = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 0);

      try {
        const respuesta = todosDepartamentos
          ? await getCalendarioEquipo(iso(desde), iso(hasta), deptosFiltro)
          : await getCalendarioEquipo(iso(desde), iso(hasta), teams);
        if (!activo) return;

        const primero = respuesta.items[0];
        if (primero) {
          const [ano, mes] = primero.fecha.split("-").map(Number);
          const mesConDatos = new Date(ano, mes - 1, 1);
          setItems(
            respuesta.items.filter((i) => i.fecha.startsWith(primero.fecha.slice(0, 7))),
          );
          if (mesConDatos.getMonth() !== cursor.getMonth()) setCursor(mesConDatos);
        } else {
          setItems([]);
        }
        setError(null);
      } catch (err) {
        if (activo) {
          setError((err as ApiFailure)?.message || "No se pudo cargar el calendario.");
        }
      } finally {
        if (activo) {
          setIsLoading(false);
          setYaBuscado(true);
        }
      }
    }

    if (!yaBuscado) {
      void inicial();
    } else {
      void cargar(cursor);
    }

    return () => {
      activo = false;
    };
    // `yaBuscado` queda fuera a propósito: cambiarlo no debe recargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, cargar]);

  const porDia = items.reduce<Record<string, CalendarioItem[]>>((acc, item) => {
    (acc[item.fecha] ??= []).push(item);
    return acc;
  }, {});

  const hoy = iso(new Date());

  function mover(pasos: number) {
    setDiaAbierto(null);
    setCursor((actual) => {
      if (vista === "semana") {
        const siguiente = new Date(actual);
        siguiente.setDate(actual.getDate() + pasos * 7);
        return siguiente;
      }
      return new Date(actual.getFullYear(), actual.getMonth() + pasos, 1);
    });
  }

  /** "septiembre 2026" en vista de mes; "1–7 de septiembre 2026" (o cruzando
   *  mes, "29 ago – 4 sep") en vista de semana. */
  function tituloDeVista() {
    if (vista === "mes") return `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;

    const { desde, hasta } = rangoDeVista(cursor, "semana");
    const rango =
      desde.getMonth() === hasta.getMonth()
        ? `${desde.getDate()}–${hasta.getDate()} de ${MESES[desde.getMonth()]}`
        : `${desde.getDate()} ${MESES[desde.getMonth()].slice(0, 3)} – ` +
          `${hasta.getDate()} ${MESES[hasta.getMonth()].slice(0, 3)}`;
    return `${rango} ${hasta.getFullYear()}`;
  }

  function irAHoy() {
    const ahora = new Date();
    setDiaAbierto(null);
    setCursor(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  }

  async function crearEnDia(fecha: string) {
    const titulo = tituloNuevo.trim();
    if (!titulo) return;

    try {
      await apiDepto(deptoNuevaTarea).createTask({ titulo, deadline: fecha });
      setTituloNuevo("");
      setDiaAbierto(null);
      await cargar(cursor);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo crear la tarea.");
    }
  }

  function botonEvento(
    item: CalendarioItem,
    extra?: { style?: CSSProperties; className?: string },
  ) {
    const claseDepto = item.departamento ? ` ${DEPTO_CLASE[item.departamento] ?? ""}` : "";
    const etiquetaDepto = item.departamento ? DEPTO_LABEL[item.departamento as Team] : null;
    // Abrir la campaña solo tiene sentido si es de un departamento PROPIO --
    // una del departamento de otra persona no se encontraría en su panel de
    // Campañas (sin acceso), así que un ítem así se ve pero no navega a
    // ningún sitio. "Propio" ya no es "el departamento activo": el
    // calendario es uno solo y puede enseñar cualquiera de los departamentos
    // de la persona, no solo aquel por el que se entró.
    const esDeUnDeptoPropio = !item.departamento || teams.includes(item.departamento as Team);

    return (
      <button
        key={`${item.origen}-${item.id}`}
        type="button"
        className={`mkt-evento-react mkt-evento-${item.origen}-react${
          item.prioridad === "alta" ? " mkt-evento-alta-react" : ""
        }${claseDepto}${extra?.className ? ` ${extra.className}` : ""}`}
        style={extra?.style}
        title={`${item.hora ? `${item.hora} — ` : ""}${etiquetaDepto ? `${etiquetaDepto} — ` : ""}${item.padre ? `${item.padre} — ` : ""}${item.titulo}`}
        onClick={() =>
          esDeUnDeptoPropio &&
          item.campaign_id !== null &&
          onAbrirCampaign(item.campaign_id, item.departamento as Team)
        }
      >
        {item.hora ? <span className="mkt-evento-hora-react">{item.hora}</span> : null}
        <span className="mkt-evento-texto-react">{item.titulo}</span>
        {item.responsables.length > 0 ? (
          <AvataresDeResponsables
            responsables={item.responsables}
            directorio={directorio}
            maximo={2}
            className="mkt-evento-avatares-react"
          />
        ) : null}
      </button>
    );
  }

  function formularioNuevaTarea(clave: string, etiqueta: string) {
    return (
      <form
        className="mkt-dia-form-react"
        onSubmit={(event) => {
          event.preventDefault();
          void crearEnDia(clave);
        }}
      >
        {teams.length > 1 ? (
          <select
            className="mkt-btn-mini-react"
            value={deptoNuevaTarea}
            aria-label="Departamento de la tarea nueva"
            onChange={(event) => setDeptoNuevaTarea(event.target.value as Team)}
          >
            {teams.map((team) => (
              <option key={team} value={team}>
                {DEPTO_LABEL[team]}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="text"
          autoFocus
          value={tituloNuevo}
          placeholder="Nueva tarea"
          aria-label={`Título de la tarea para el ${etiqueta}`}
          onChange={(event) => setTituloNuevo(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setDiaAbierto(null);
          }}
        />
        <button type="submit" className="mkt-btn-mini-react" disabled={!tituloNuevo.trim()}>
          Añadir
        </button>
      </form>
    );
  }

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="mkt-panel-header-react">
        <h3>{tituloDeVista()}</h3>
        <div className="mkt-calendario-nav-react">
          <div className="mkt-vista-toggle-react" role="group" aria-label="Vista del calendario">
            <button
              type="button"
              className={`mkt-btn-mini-react${vista === "mes" ? " mkt-btn-mini-activo-react" : ""}`}
              aria-pressed={vista === "mes"}
              onClick={() => setVista("mes")}
            >
              Mes
            </button>
            <button
              type="button"
              className={`mkt-btn-mini-react${vista === "semana" ? " mkt-btn-mini-activo-react" : ""}`}
              aria-pressed={vista === "semana"}
              onClick={() => setVista("semana")}
            >
              Semana
            </button>
          </div>
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

      <div className="mkt-filtros-react" role="group" aria-label="Departamentos visibles">
        <label className="mkt-toggle-react">
          <input
            type="checkbox"
            checked={todosDepartamentos}
            onChange={(event) => setTodosDepartamentos(event.target.checked)}
          />
          Todos los departamentos
        </label>
        {todosDepartamentos
          ? TODOS_LOS_DEPARTAMENTOS.map((depto) => (
              <button
                key={depto}
                type="button"
                className={`mkt-btn-mini-react mkt-agenda-leyenda-punto-react ${DEPTO_CLASE[depto]}`}
                aria-pressed={deptosFiltro.includes(depto)}
                onClick={() =>
                  setDeptosFiltro((actuales) =>
                    actuales.includes(depto)
                      ? actuales.filter((d) => d !== depto)
                      : [...actuales, depto],
                  )
                }
              >
                {DEPTO_LABEL[depto]}
              </button>
            ))
          : null}
      </div>

      {/* La leyenda va antes de la rejilla: leerla después de haber necesitado
          el código de color no sirve de nada. */}
      <div className="mkt-leyenda-react">
        <span className="mkt-evento-react mkt-evento-content-react">Publicación</span>
        <span className="mkt-evento-react mkt-evento-task-react">Tarea</span>
        <span className="mkt-evento-react mkt-evento-reunion-react">Reunión</span>
        <span className="mkt-evento-react mkt-evento-alta-react">Tarea urgente</span>
        <span className="mkt-leyenda-notas-react">
          {todosDepartamentos ? (
            <span className="mkt-leyenda-nota-react">
              El color del borde izquierdo dice de qué departamento es.
            </span>
          ) : null}
          <span className="mkt-leyenda-nota-react">
            Toca un día para añadir una tarea.
          </span>
        </span>
      </div>

      {isLoading ? (
        <Esqueleto filas={5} alto={54} />
      ) : items.length === 0 ? (
        <p className="mkt-vacio-react">
          Nada en {vista === "mes" ? MESES[cursor.getMonth()] : "esta semana"}. Puedes
          tocar cualquier día para añadir una tarea, o cambiar de {vista} arriba.
        </p>
      ) : null}

      {!isLoading && vista === "mes" ? (
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
                <button
                  type="button"
                  className="mkt-dia-numero-react"
                  aria-label={`Añadir tarea el ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`}
                  onClick={() => {
                    setTituloNuevo("");
                    setDiaAbierto(diaAbierto === clave ? null : clave);
                  }}
                >
                  {fecha.getDate()}
                  <span aria-hidden="true" className="mkt-dia-mas-react">
                    +
                  </span>
                </button>

                {visibles.map((item) => botonEvento(item))}

                {ocultos > 0 ? (
                  <span className="mkt-dia-mas-eventos-react">+{ocultos} más</span>
                ) : null}

                {diaAbierto === clave
                  ? formularioNuevaTarea(clave, `${fecha.getDate()}`)
                  : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Vista semana: una rejilla de horas de verdad, como Google Calendar.
          Lo que tiene hora (tareas con hora puesta, reuniones) se coloca a su
          altura; lo que solo tiene fecha (publicaciones, tareas sin hora) va
          en la franja de "todo el día" de arriba, que es donde vivía todo
          antes de esto. */}
      {!isLoading && vista === "semana" ? (
        <div className="mkt-semana-react">
          <div className="mkt-semana-todo-el-dia-react">
            <div className="mkt-semana-gutter-react" aria-hidden="true">
              Todo el día
            </div>
            {celdasDeLaSemana(cursor).map((fecha) => {
              const clave = iso(fecha);
              const delDia = porDia[clave] ?? [];
              const sinHora = delDia.filter(
                (item) => posicionEnRejilla(item.hora ?? "") === null,
              );

              return (
                <div
                  key={clave}
                  className={`mkt-semana-dia-react${clave === hoy ? " mkt-semana-dia-hoy-react" : ""}`}
                >
                  <button
                    type="button"
                    className="mkt-semana-dia-cabecera-react"
                    aria-label={`Añadir tarea el ${DIAS[(fecha.getDay() + 6) % 7]} ${fecha.getDate()}`}
                    onClick={() => {
                      setTituloNuevo("");
                      setDiaAbierto(diaAbierto === clave ? null : clave);
                    }}
                  >
                    <span>{DIAS[(fecha.getDay() + 6) % 7]}</span>
                    <span className="mkt-semana-dia-numero-react">
                      {fecha.getDate()}
                      <span aria-hidden="true" className="mkt-dia-mas-react">+</span>
                    </span>
                  </button>

                  {sinHora.map((item) => botonEvento(item))}

                  {diaAbierto === clave
                    ? formularioNuevaTarea(clave, `${fecha.getDate()}`)
                    : null}
                </div>
              );
            })}
          </div>

          <div className="mkt-semana-scroll-react" ref={scrollSemanaRef}>
            <div
              className="mkt-semana-rejilla-react"
              style={{ "--mkt-horas-visibles": HORAS_VISIBLES.length } as CSSProperties}
            >
              <div className="mkt-semana-horas-react">
                {HORAS_VISIBLES.map((h) => (
                  <div key={h} className="mkt-semana-hora-etiqueta-react">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {celdasDeLaSemana(cursor).map((fecha) => {
                const clave = iso(fecha);
                const delDia = porDia[clave] ?? [];
                const conHora = delDia
                  .map((item) => {
                    const pos = posicionEnRejilla(item.hora ?? "");
                    return pos ? { item, pos } : null;
                  })
                  .filter((b): b is { item: CalendarioItem; pos: Posicion } => b !== null);
                const bloques = distribuirColumnas(conHora);

                return (
                  <div
                    key={clave}
                    className={`mkt-semana-columna-react${clave === hoy ? " mkt-semana-columna-hoy-react" : ""}`}
                  >
                    {bloques.map(({ item, pos, columna, columnas }) =>
                      botonEvento(item, {
                        className: "mkt-evento-horario-react",
                        style: {
                          top: `${pos.top}%`,
                          height: `${pos.alto}%`,
                          left: `${(columna / columnas) * 100}%`,
                          width: `${100 / columnas}%`,
                        },
                      }),
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
