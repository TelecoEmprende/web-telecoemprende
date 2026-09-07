import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";

import { getEquipoCalendario } from "../../api/equipo";
import { Calendar } from "../ui/calendar";
import type { EventoCalendario } from "../../types/equipo";

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
 * cada departamento cuelgan debajo en el sidebar. El calendario se gestiona
 * desde `/admin`; aquí es solo lectura.
 */
export function CalendarioEquipo() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);

  useEffect(() => {
    let active = true;

    getEquipoCalendario()
      .then((response) => {
        if (active && response.ok) {
          setEventos(response.eventos);
        }
      })
      .catch(() => {
        // Sin calendario disponible: la sección se queda con su estado vacío.
      });

    return () => {
      active = false;
    };
  }, []);

  const fechasConEvento = useMemo(
    () => eventos.map((evento) => parsearFechaLocal(evento.fecha)),
    [eventos],
  );

  const proximos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return eventos
      .filter((evento) => parsearFechaLocal(evento.fecha) >= hoy)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  }, [eventos]);

  return (
    <section className="equipo-inicio-react">
      <div>
        <header className="equipo-panel-header-react">
          <h3>Calendario del club</h3>
        </header>
        {/* Sin `mode`/`selected`/`onSelect`: es solo-visualización, los
            eventos se resaltan vía `modifiers`/`modifiersClassNames` de
            react-day-picker, no marcando fechas como "seleccionadas". */}
        {/* `locale` y `weekStartsOn`: por defecto react-day-picker pinta el mes
            en inglés y empieza la semana en domingo, y al lado del calendario
            de Marketing (español, lunes primero) se leía como otro sitio. */}
        <Calendar
          locale={es}
          weekStartsOn={1}
          modifiers={{ evento: fechasConEvento }}
          modifiersClassNames={{
            // Naranja macizo y numeral navy: en `bg-primary/20 text-primary`
            // el número quedaba naranja sobre naranja translúcido y los días
            // con evento se leían como días deshabilitados, justo al revés.
            evento: "bg-primary/85 rounded-md font-bold",
          }}
          className="equipo-calendario-react"
        />
      </div>

      <div>
        <header className="equipo-panel-header-react">
          <h3>Próximos eventos</h3>
        </header>
        {proximos.length === 0 ? (
          <p className="equipo-vacio-react">
            No hay nada apuntado. Los eventos del club se añaden desde el panel
            de administración.
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
      </div>
    </section>
  );
}
