import type { Team } from "./equipo";
import type { CampaignResumen } from "./marketing";

export type EntidadClub = "proyecto" | "entregable" | "tarea" | "nota" | "reunion";

export const ENTIDAD_LABEL: Record<EntidadClub, string> = {
  proyecto: "el proyecto",
  entregable: "el entregable",
  tarea: "la tarea",
  nota: "la nota",
  reunion: "la reunión",
};

export type CambioHistorial = {
  campo: string;
  antes: unknown;
  despues: unknown;
};

/** Una línea del historial: quién hizo qué sobre qué, y los cambios campo a
 *  campo si fue una edición (ver `services/historial.py`). */
export type EventoHistorial = {
  id: number;
  entidad: EntidadClub;
  entidad_id: number;
  proyecto_id: number | null;
  accion: "crear" | "editar" | "borrar" | "restaurar";
  titulo: string;
  cambios: CambioHistorial[];
  creado_en: string;
  /** Email de quien lo hizo, o "" si esa cuenta ya no existe. */
  persona: string;
  persona_nombre: string;
};

export type ElementoPapelera = {
  entidad: EntidadClub;
  id: number;
  titulo: string;
  /** De dónde colgaba (el proyecto o el entregable). */
  padre: string | null;
  borrado_en: string;
  borrado_por: string;
  borrado_por_nombre: string;
};

type TareaDeMesa = {
  id: number;
  titulo: string;
  departamento: Team;
  deadline: string | null;
  padre: string | null;
  responsables?: string[];
};

export type ProyectoDeMesa = Pick<
  CampaignResumen,
  "id" | "nombre" | "estado" | "departamentos" | "responsable" | "fecha" | "total_tasks" | "tareas_acabadas"
> & {
  ultima_actividad: string | null;
  dias_sin_movimiento: number | null;
  estancado: boolean;
  siguiente_titulo: string | null;
  siguiente_deadline: string | null;
  siguiente_responsables: string[] | null;
  /** Las fases del proyecto: cada entregable con sus tareas acabadas. */
  entregables: { id: number; titulo: string; fecha: string | null; total: number; acabadas: number }[];
};

export type Mesa = {
  proyectos: ProyectoDeMesa[];
  sin_dueno: TareaDeMesa[];
  atrasadas: TareaDeMesa[];
  /** Cada cuenta activa con lo que tiene abierto, la más cargada primero. */
  personas: { email: string; tareas: TareaDeMesa[]; atrasadas: number }[];
  sin_responsable: number;
  estancados: number;
  dias_estancado: number;
};
