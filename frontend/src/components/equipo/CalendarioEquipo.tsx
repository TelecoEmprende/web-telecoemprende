import { useEffect, useMemo, useState } from "react";

import { getEquipoCalendario } from "../../api/equipo";
import { Calendar } from "../ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { EventoCalendario } from "../../types/equipo";

function parsearFechaLocal(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFecha(fecha: string) {
  return parsearFechaLocal(fecha).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });
}

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
        // Sin calendario disponible: la tarjeta simplemente se queda vacía.
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
    <Card>
      <CardHeader>
        <CardTitle>Calendario compartido</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Sin `mode`/`selected`/`onSelect`: es solo-visualización, los
            eventos se resaltan vía `modifiers`/`modifiersClassNames` de
            react-day-picker, no marcando fechas como "seleccionadas". */}
        <Calendar
          modifiers={{ evento: fechasConEvento }}
          modifiersClassNames={{
            evento: "bg-primary/20 text-primary font-semibold",
          }}
          className="rounded-lg border p-3"
        />

        <div className="flex flex-1 flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">Próximos eventos</h3>
          {proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay próximos eventos.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {proximos.map((evento) => (
                <li key={evento.id} className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">
                    {evento.titulo}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {formatearFecha(evento.fecha)}
                      {evento.hora ? ` · ${evento.hora}` : ""}
                    </span>
                  </p>
                  {evento.descripcion ? (
                    <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
