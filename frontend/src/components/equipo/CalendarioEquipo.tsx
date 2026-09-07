import { useMemo, useState, useEffect } from "react";

import { getEquipoCalendario } from "../../api/equipo";
import type { EventoCalendario } from "../../types/equipo";

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

  const porDia = useMemo(
    () =>
      eventos.reduce<Record<string, EventoCalendario[]>>((acc, evento) => {
        (acc[evento.fecha] ??= []).push(evento);
        return acc;
      }, {}),
    [eventos],
  );

  const proximos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return eventos
      .filter((evento) => parsearFechaLocal(evento.fecha) >= hoy)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  }, [eventos]);

  const hoy = iso(new Date());

  function mover(meses: number) {
    setCursor((actual) => new Date(actual.getFullYear(), actual.getMonth() + meses, 1));
  }

  function irAHoy() {
    const ahora = new Date();
    setCursor(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  }

  return (
    <>
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

      <section className="equipo-proximos-react">
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
      </section>
    </>
  );
}
