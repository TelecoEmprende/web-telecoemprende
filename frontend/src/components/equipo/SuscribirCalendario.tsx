import { useState } from "react";

import type { ApiFailure } from "../../types/api";

type Props = {
  /** Distinto según el calendario: el de Marketing o el general de /equipo. */
  obtenerEnlace: () => Promise<{ url: string }>;
  onError: (mensaje: string) => void;
};

/**
 * Botón de "Suscribirse" para un calendario (.ics): abre el flujo de
 * "añadir por URL" de Google Calendar directamente, y deja el enlace en
 * pantalla como alternativa por si el popup se bloquea o se usa otra app.
 *
 * Compartido entre el calendario de Marketing y el general de /equipo: el
 * botón es el mismo, solo cambia de dónde sale el enlace firmado.
 */
export function SuscribirCalendario({ obtenerEnlace, onError }: Props) {
  const [enlace, setEnlace] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function suscribir() {
    setCargando(true);
    try {
      const { url } = await obtenerEnlace();
      setEnlace(url);
      window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`, "_blank");
    } catch (err) {
      onError((err as ApiFailure)?.message || "No se pudo generar el enlace del calendario.");
    } finally {
      setCargando(false);
    }
  }

  async function copiar() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer: el enlace se
      // queda a la vista para copiarlo a mano.
    }
  }

  return (
    <>
      <button
        type="button"
        className="mkt-btn-mini-react"
        onClick={() => void suscribir()}
        disabled={cargando}
      >
        {cargando ? "Generando enlace..." : "📅 Suscribirse"}
      </button>

      {enlace ? (
        <p className="mkt-leyenda-nota-react">
          Se ha abierto Google Calendar en otra pestaña para confirmar la
          suscripción. Si no, o usas otra app de calendario, copia este
          enlace y añádelo como "calendario por URL": <code>{enlace}</code>{" "}
          <button type="button" className="mkt-btn-mini-react" onClick={() => void copiar()}>
            Copiar
          </button>
        </p>
      ) : null}
    </>
  );
}
