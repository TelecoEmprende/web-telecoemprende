import { useState } from "react";

import type { ApiFailure } from "../../types/api";

type Props = {
  /** Distinto según el calendario: el de Marketing o el general de /equipo. */
  obtenerEnlace: () => Promise<{ url: string }>;
  onError: (mensaje: string) => void;
};

/**
 * Botón de "Suscribirse" para un calendario (.ics).
 *
 * Antes intentaba abrir el diálogo de "añadir calendario" de Google
 * directamente (`calendar.google.com/calendar/r?cid=...`). Es un atajo no
 * oficial de Google -- ni lo documentan ni prometen que siga funcionando --
 * y en la práctica a veces solo abre Google Calendar sin más, dando la
 * sensación de que el botón está roto aunque el enlace en sí sea válido.
 * Ahora copia el enlace directo y da las dos instrucciones manuales (Google
 * Calendar y "cualquier otro"), que sí son siempre fiables.
 *
 * Compartido entre el calendario de Marketing y el general de /equipo: el
 * botón es el mismo, solo cambia de dónde sale el enlace firmado.
 */
export function SuscribirCalendario({ obtenerEnlace, onError }: Props) {
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function suscribir() {
    setCargando(true);
    try {
      const { url } = await obtenerEnlace();
      setEnlace(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopiado(true);
      } catch {
        // Sin permiso de portapapeles no hay nada que hacer: el enlace se
        // queda a la vista para copiarlo a mano con el botón de abajo.
      }
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
      setCopiado(true);
    } catch {
      // Igual que arriba: sin permiso de portapapeles, queda a la vista.
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
          {copiado ? "Enlace copiado. " : ""}
          En Google Calendar: <strong>Otros calendarios</strong> (el + de la
          izquierda) → <strong>Desde URL</strong>, y pega el enlace. En otra
          app, busca "suscribirse a un calendario por URL". El enlace:{" "}
          <code>{enlace}</code>{" "}
          <button type="button" className="mkt-btn-mini-react" onClick={() => void copiar()}>
            Copiar
          </button>
        </p>
      ) : null}
    </>
  );
}
