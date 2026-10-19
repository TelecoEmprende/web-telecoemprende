import { useEffect, useState } from "react";

import { Esqueleto } from "../../feedback/Esqueleto";
import { getHistorial } from "../../../api/club";
import { etiquetaDe } from "../marketing/Avatares";
import { AlertBanner } from "../../feedback/AlertBanner";
import { DEPTO_LABEL, type Team } from "../../../types/equipo";
import {
  CONTENT_ESTADO_LABEL,
  PROYECTO_ESTADO_LABEL,
  TASK_ESTADO_LABEL,
  formatearFecha,
  haceCuanto,
  type ContentEstado,
  type ProyectoEstado,
  type TaskEstado,
} from "../../../types/marketing";
import { ENTIDAD_LABEL, type CambioHistorial, type EntidadClub, type EventoHistorial } from "../../../types/club";

/** Cómo se nombra cada campo en una frase («cambió *el plazo* de…»). */
const CAMPO: Record<string, string> = {
  nombre: "el nombre",
  titulo: "el título",
  objetivo: "el objetivo",
  audiencia: "el público",
  fecha: "la fecha",
  archivado: "el archivo",
  estado: "el estado",
  departamentos: "el ámbito",
  departamento: "el departamento",
  responsable: "el responsable",
  responsables: "los responsables",
  descripcion: "la descripción",
  instrucciones: "las instrucciones",
  prioridad: "la prioridad",
  deadline: "el plazo",
  hora: "la hora",
  tags: "las etiquetas",
  checklist: "la checklist",
  enlaces: "los enlaces",
  campaign_id: "el proyecto",
  content_id: "el entregable",
  tipo: "el tipo",
  plataforma: "la plataforma",
  fecha_publicacion: "la fecha de publicación",
  script: "el guion",
  copy_texto: "el copy",
  cta: "la llamada a la acción",
  hashtags: "los hashtags",
  idea_visual: "la idea visual",
  contenido: "el contenido",
  privada: "la privacidad",
  fijada: "el pin",
  proyecto_id: "el proyecto enlazado",
};

const ESTADOS: Record<string, string> = {
  ...TASK_ESTADO_LABEL,
  ...CONTENT_ESTADO_LABEL,
  ...PROYECTO_ESTADO_LABEL,
} satisfies Record<TaskEstado | ContentEstado | ProyectoEstado, string>;

/** Un valor del historial, tal como se lee en una frase. */
export function formatearValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "nada";
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "nadie";
    const partes = valor.map((v) => formatearValor(campo, v));
    if (campo === "checklist") return `${valor.length} puntos`;
    return partes.join(", ");
  }
  if (typeof valor === "boolean") return valor ? "sí" : "no";
  if (typeof valor === "object") return "…";
  const texto = String(valor);
  if (campo === "estado") return ESTADOS[texto] ?? texto;
  if (campo === "departamentos" || campo === "departamento") {
    return DEPTO_LABEL[texto as Team] ?? texto;
  }
  if (campo === "responsables" || campo === "responsable") return etiquetaDe(texto);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto) && ["deadline", "fecha", "fecha_publicacion"].includes(campo)) {
    return formatearFecha(texto.slice(0, 10), true);
  }
  return texto.length > 80 ? `${texto.slice(0, 80)}…` : texto;
}

/** «Ana cambió el estado de «Feria» de Activo a En pausa». */
export function describirEvento(e: EventoHistorial): { quien: string; frase: string; detalle: CambioHistorial[] } {
  const quien = e.persona ? etiquetaDe(e.persona, e.persona_nombre) : "Alguien";
  const que = `${ENTIDAD_LABEL[e.entidad as EntidadClub]} «${e.titulo}»`;
  switch (e.accion) {
    case "crear":
      return { quien, frase: `creó ${que}`, detalle: [] };
    case "borrar":
      return { quien, frase: `envió a la papelera ${que}`, detalle: [] };
    case "restaurar":
      return { quien, frase: `restauró ${que}`, detalle: [] };
    default: {
      if (e.cambios.length === 1) {
        const c = e.cambios[0];
        const campo = CAMPO[c.campo] ?? c.campo;
        // El contenido de una nota o un acta no se copia: solo consta que cambió.
        if (c.campo === "contenido") return { quien, frase: `editó el contenido de ${que}`, detalle: [] };
        return {
          quien,
          frase: `cambió ${campo} de ${que}`,
          detalle: [c],
        };
      }
      return { quien, frase: `editó ${que}`, detalle: e.cambios };
    }
  }
}

/** Lista de eventos del historial, del más reciente al más antiguo. */
export function HistorialLista({ eventos }: { eventos: EventoHistorial[] }) {
  if (eventos.length === 0) {
    return <p className="mkt-vacio-inline-react">Todavía no hay nada apuntado.</p>;
  }
  return (
    <ul className="hist-lista-react">
      {eventos.map((e) => {
        const { quien, frase, detalle } = describirEvento(e);
        return (
          <li key={e.id} className={`hist-evento-react hist-${e.accion}-react`}>
            <span className="hist-punto-react" aria-hidden="true" />
            <div>
              <p>
                <strong>{quien}</strong> {frase}
              </p>
              {detalle.length > 0 ? (
                <ul className="hist-cambios-react">
                  {detalle.map((c) => (
                    <li key={c.campo}>
                      {c.campo === "contenido" ? (
                        <>Cambió el contenido</>
                      ) : (
                        <>
                          {CAMPO[c.campo] ?? c.campo}: <s>{formatearValor(c.campo, c.antes)}</s>{" "}
                          → <b>{formatearValor(c.campo, c.despues)}</b>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <time dateTime={e.creado_en} title={new Date(e.creado_en).toLocaleString("es-ES")}>
              {haceCuanto(e.creado_en)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

/** Historial de un proyecto (con sus entregables y tareas) o de una sola
 *  cosa, cargado al montar. */
export function HistorialCargado({
  proyectoId,
  entidad,
  id,
  limite = 30,
}: {
  proyectoId?: number;
  entidad?: EntidadClub;
  id?: number;
  limite?: number;
}) {
  const [eventos, setEventos] = useState<EventoHistorial[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getHistorial({ proyecto_id: proyectoId, entidad, id, limite })
      .then((r) => {
        if (activo) setEventos(r.eventos);
      })
      .catch(() => {
        if (activo) setError("No se pudo cargar el historial.");
      });
    return () => {
      activo = false;
    };
  }, [proyectoId, entidad, id, limite]);

  if (error) return <AlertBanner variant="error" message={error} />;
  if (eventos === null) return <Esqueleto filas={3} alto={36} />;
  return <HistorialLista eventos={eventos} />;
}
