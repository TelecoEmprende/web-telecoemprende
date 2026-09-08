import { useCallback, useEffect, useState } from "react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { SuscribirCalendario } from "../SuscribirCalendario";
import { AvataresDeResponsables } from "./Avatares";
import type { ApiFailure } from "../../../types/api";
import type { CalendarioItem } from "../../../types/marketing";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Cuántos elementos caben en una celda antes de plegar el resto. */
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

type Props = {
  /** Abrir la campaña de un elemento del calendario, para que no sea un
   *  callejón sin salida: se ve algo, se toca, se llega a ello. */
  onAbrirCampaign: (campaignId: number) => void;
};

export function CalendarPanel({ onAbrirCampaign }: Props) {
  const { createTask, getCalendario, getEnlaceCalendario } = useApi();

  const [cursor, setCursor] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [vista, setVista] = useState<Vista>("mes");
  const [items, setItems] = useState<CalendarioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const [tituloNuevo, setTituloNuevo] = useState("");
  // Se busca un mes con datos una sola vez, en el primer montaje. Después el
  // usuario manda: si navega a un mes vacío, se queda ahí.
  const [yaBuscado, setYaBuscado] = useState(false);

  const cargar = useCallback(async (referencia: Date) => {
    setIsLoading(true);
    const { desde, hasta } = rangoDeVista(referencia, vista);

    try {
      const respuesta = await getCalendario(iso(desde), iso(hasta));
      setItems(respuesta.items);
      setError(null);
      return respuesta.items;
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo cargar el calendario.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [vista]);

  useEffect(() => {
    let activo = true;

    async function inicial() {
      // Una sola consulta de tres meses en vez de una por mes: abrir en un mes
      // en blanco sin ninguna pista se lee como "esto está roto", pero buscarlo
      // mes a mes eran cuatro peticiones para pintar una rejilla.
      const desde = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const hasta = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 0);

      try {
        const respuesta = await getCalendario(iso(desde), iso(hasta));
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
      await createTask({ titulo, deadline: fecha });
      setTituloNuevo("");
      setDiaAbierto(null);
      await cargar(cursor);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo crear la tarea.");
    }
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
          <SuscribirCalendario obtenerEnlace={getEnlaceCalendario} onError={setError} />
        </div>
      </header>

      {/* La leyenda va antes de la rejilla: leerla después de haber necesitado
          el código de color no sirve de nada. */}
      <div className="mkt-leyenda-react">
        <span className="mkt-evento-react mkt-evento-content-react">Publicación</span>
        <span className="mkt-evento-react mkt-evento-task-react">Tarea</span>
        <span className="mkt-evento-react mkt-evento-alta-react">Tarea urgente</span>
        <span className="mkt-leyenda-nota-react">
          Toca un día para añadir una tarea.
        </span>
      </div>

      {isLoading ? (
        <Esqueleto filas={5} alto={54} />
      ) : (
        <>
          {items.length === 0 ? (
            <p className="mkt-vacio-react">
              Nada en {vista === "mes" ? MESES[cursor.getMonth()] : "esta semana"}. Puedes
              tocar cualquier día para añadir una tarea, o cambiar de {vista} arriba.
            </p>
          ) : null}

          <div className="mkt-calendario-react">
            {DIAS.map((dia) => (
              <div key={dia} className="mkt-calendario-cabecera-react">
                {dia}
              </div>
            ))}

            {(vista === "mes"
              ? celdasDelMes(cursor.getFullYear(), cursor.getMonth())
              : celdasDeLaSemana(cursor)
            ).map((fecha, indice) => {
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

                  {visibles.map((item) => (
                    <button
                      key={`${item.origen}-${item.id}`}
                      type="button"
                      className={`mkt-evento-react mkt-evento-${item.origen}-react${
                        item.prioridad === "alta" ? " mkt-evento-alta-react" : ""
                      }`}
                      title={`${item.padre ? `${item.padre} — ` : ""}${item.titulo}`}
                      onClick={() =>
                        item.campaign_id !== null && onAbrirCampaign(item.campaign_id)
                      }
                    >
                      <span className="mkt-evento-texto-react">{item.titulo}</span>
                      {item.responsables.length > 0 ? (
                        <AvataresDeResponsables
                          responsables={item.responsables}
                          maximo={2}
                          className="mkt-evento-avatares-react"
                        />
                      ) : null}
                    </button>
                  ))}

                  {ocultos > 0 ? (
                    <span className="mkt-dia-mas-eventos-react">+{ocultos} más</span>
                  ) : null}

                  {diaAbierto === clave ? (
                    <form
                      className="mkt-dia-form-react"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void crearEnDia(clave);
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={tituloNuevo}
                        placeholder="Nueva tarea"
                        aria-label={`Título de la tarea para el ${fecha.getDate()}`}
                        onChange={(event) => setTituloNuevo(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setDiaAbierto(null);
                        }}
                      />
                      <button
                        type="submit"
                        className="mkt-btn-mini-react"
                        disabled={!tituloNuevo.trim()}
                      >
                        Añadir
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
