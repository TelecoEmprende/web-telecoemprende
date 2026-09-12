export const TASK_ESTADOS = [
  "pendiente",
  "en_progreso",
  "por_revisar",
  "acabado",
] as const;

export const CONTENT_ESTADOS = [
  "idea",
  "generado",
  "en_diseno",
  "en_revision",
  "programado",
  "publicado",
] as const;

export const PRIORIDADES = ["baja", "media", "alta"] as const;

// Deben coincidir con backend/config.py (MAX_TITULO_LEN, MAX_TEXTO_LARGO_LEN):
// no hay un sitio compartido entre Python y TypeScript, así que si cambian
// ahí, hay que cambiarlos aquí también.
export const MAX_TITULO_LEN = 160;
export const MAX_TEXTO_LARGO_LEN = 5000;

export type TaskEstado = (typeof TASK_ESTADOS)[number];
export type ContentEstado = (typeof CONTENT_ESTADOS)[number];
export type Prioridad = (typeof PRIORIDADES)[number];

/** Etiquetas para pantalla. La API habla en snake_case, la interfaz en español. */
export const TASK_ESTADO_LABEL: Record<TaskEstado, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  por_revisar: "Por revisar",
  acabado: "Acabado",
};

export const CONTENT_ESTADO_LABEL: Record<ContentEstado, string> = {
  idea: "Idea",
  generado: "Generado",
  en_diseno: "En diseño",
  en_revision: "En revisión",
  programado: "Programado",
  publicado: "Publicado",
};

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export type ChecklistItem = {
  texto: string;
  hecho: boolean;
};

export type Task = {
  id: number;
  departamento: string;
  campaign_id: number | null;
  content_id: number | null;
  titulo: string;
  descripcion: string;
  estado: TaskEstado;
  prioridad: Prioridad;
  deadline: string | null;
  /** "HH:MM", o "" si la tarea solo tiene fecha límite y no hora. */
  hora: string;
  responsables: string[];
  tags: string[];
  checklist: ChecklistItem[];
  enlaces: string[];
  creado_por: string;
  created_at: string;
  updated_at: string;
  /** Sólo en el listado de tareas: de qué contenido/campaña cuelga. */
  content_titulo?: string | null;
  campaign_nombre?: string | null;
};

export type Content = {
  id: number;
  campaign_id: number;
  titulo: string;
  tipo: string;
  plataforma: string;
  fecha_publicacion: string | null;
  estado: ContentEstado;
  script: string;
  copy_texto: string;
  cta: string;
  hashtags: string;
  idea_visual: string;
  responsables: string[];
  enlaces: string[];
  created_at: string;
  updated_at: string;
  tasks: Task[];
};

export type Campaign = {
  id: number;
  nombre: string;
  objetivo: string;
  audiencia: string;
  fecha: string | null;
  archivado: boolean;
  creado_por: string;
  created_at: string;
  updated_at: string;
};

export type CampaignResumen = Campaign & {
  total_contents: number;
  total_tasks: number;
};

export type CampaignDetalle = Campaign & {
  contents: Content[];
  tasks_sueltas: Task[];
};

export type CalendarioItem = {
  origen: "task" | "content" | "reunion";
  id: number;
  titulo: string;
  fecha: string;
  estado: string;
  campaign_id: number | null;
  detalle: string;
  prioridad: Prioridad | null;
  /** Contenido o campaña de la que cuelga, para no leer títulos huérfanos. */
  padre: string | null;
  responsables: string[];
  /** "HH:MM", o null si es de día completo (publicaciones siempre lo son). */
  hora: string | null;
  /** Solo en la lectura cruzada entre departamentos (`getCalendarioEquipo`). */
  departamento?: string;
};

export type Miembro = {
  email: string;
  equipos: string[];
  activo: boolean;
  /** Etiquetas de habilidad, del perfil de la persona. */
  tags: string[];
  /** Nombre para mostrar. Vacío si todavía no se ha rellenado en /admin. */
  nombre: string;
  /** Tareas sin acabar en ESTE departamento. Se calcula, no se guarda. */
  abiertas: number;
};

export type TaskComment = {
  id: number;
  task_id: number;
  autor: string;
  texto: string;
  created_at: string;
};

/** Una entrada del historial: el estado actual de una tarea suya. */
export type ActividadMiembro = {
  id: number;
  titulo: string;
  estado: TaskEstado;
  updated_at: string;
  padre: string | null;
};

export type FichaMiembro = {
  email: string;
  equipos: string[];
  vp_de: string[];
  cargo: string;
  tags: string[];
  notas: string;
  nombre: string;
  desde: string;
  abiertas: number;
  completadas: number;
  campanas: number;
  actividad: ActividadMiembro[];
};

/** Fechas en el formato de aquí (15 oct), no en ISO crudo. */
export function formatearFecha(iso: string | null, conAno = false) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    ...(conAno ? { year: "numeric" } : {}),
  }).format(new Date(ano, mes - 1, dia));
}

/** Días de diferencia con hoy. Negativo = ya ha pasado. */
export function diasHasta(iso: string | null) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-").map(Number);
  const hoy = new Date();
  const objetivo = new Date(ano, mes - 1, dia);
  const soloHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo.getTime() - soloHoy.getTime()) / 86400000);
}


/** "hace 2 días", "ayer", "hoy". Para el historial de la ficha de miembro. */
export function haceCuanto(iso: string) {
  const dias = diasHasta(iso.slice(0, 10));
  if (dias === null) return "";
  if (dias === 0) return "hoy";
  if (dias === -1) return "ayer";
  if (dias < 0) return `hace ${Math.abs(dias)} días`;
  return formatearFecha(iso.slice(0, 10));
}
