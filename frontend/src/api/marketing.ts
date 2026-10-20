import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type {
  ProyectoEstado,
  CalendarioItem,
  FichaMiembro,
  CampaignDetalle,
  CampaignResumen,
  Content,
  Miembro,
  Task,
  TaskComment,
} from "../types/marketing";
import { ADMINISTRATIVO, type Tablero, type Team } from "../types/equipo";
import type {
  EstadoPlataforma,
  Recurso,
  Registro,
  ResumenPresupuesto,
} from "../types/registros";

export const getMiembrosClub = () =>
  apiRequest<{ ok: true; miembros: Miembro[] }>("/api/equipo/miembros");

export const getFichaMiembro = (email: string) =>
  apiRequest<{ ok: true; ficha: FichaMiembro }>(
    `/api/equipo/miembros/ficha?email=${encodeURIComponent(email)}`,
  );

export const updateFichaMiembro = (
  email: string,
  datos: {
    tags?: string[];
    notas?: string;
    /** Data URL ya reducida (ver `utils/imagen.ts`); "" borra la propia. */
    foto?: string;
  },
) =>
  apiRequest<ApiResult>("/api/equipo/miembros/ficha", {
    method: "PUT",
    body: JSON.stringify({ email, ...datos }),
  });

/**
 * Cliente del workspace de un departamento.
 *
 * Los tres departamentos comparten API (el mismo blueprint registrado tres
 * veces en el backend), y lo único que los separa es el prefijo de la ruta. Por eso
 * esto es una factoría y no un módulo de funciones sueltas: los paneles no
 * tienen que ir pasando el departamento en cada llamada, lo reciben ya atado
 * vía `useApi()` (ver `DeptoApi.tsx`).
 */
export function apiDepto(depto: Tablero) {
  // Una tarea administrativa se lee y se guarda desde la ruta de cualquier
  // departamento (el backend la incluye en los tres).
  const BASE = `/api/${depto === ADMINISTRATIVO ? "marketing" : depto}`;

  const post = <T,>(ruta: string, body: unknown) =>
    apiRequest<T>(`${BASE}${ruta}`, { method: "POST", body: JSON.stringify(body) });

  const put = <T,>(ruta: string, body: unknown) =>
    apiRequest<T>(`${BASE}${ruta}`, { method: "PUT", body: JSON.stringify(body) });

  const del = (ruta: string) =>
    apiRequest<ApiResult>(`${BASE}${ruta}`, { method: "DELETE" });

  return {
    // --- Campaigns ---
    /** Con `deptos`, los proyectos de todos ellos en una sola petición. */
    getCampaigns: (deptos?: Team[]) =>
      apiRequest<{ ok: true; campaigns: CampaignResumen[] }>(
        `${BASE}/campaigns${deptos?.length ? `?deptos=${deptos.join(",")}` : ""}`,
      ),

    getCampaign: (id: number) =>
      apiRequest<{ ok: true; campaign: CampaignDetalle }>(`${BASE}/campaigns/${id}`),

    createCampaign: (datos: {
      nombre: string;
      objetivo?: string;
      audiencia?: string;
      fecha?: string | null;
      departamentos?: Team[];
      estado?: ProyectoEstado;
      responsable?: string;
    }) => post<{ ok: true; campaign: CampaignResumen }>("/campaigns", datos),

    updateCampaign: (id: number, datos: Partial<CampaignResumen>) =>
      put<ApiResult>(`/campaigns/${id}`, datos),

    deleteCampaign: (id: number) => del(`/campaigns/${id}`),

    duplicateCampaign: (id: number) =>
      post<{ ok: true; campaign: CampaignDetalle }>(`/campaigns/${id}/duplicar`, {}),

    // --- Contents ---
    createContent: (campaignId: number, datos: Partial<Content>) =>
      post<{ ok: true; content: Content }>(`/campaigns/${campaignId}/contents`, datos),

    updateContent: (id: number, datos: Partial<Content>) =>
      put<ApiResult>(`/contents/${id}`, datos),

    deleteContent: (id: number) => del(`/contents/${id}`),

    // --- Tasks ---
    getTasks: () =>
      apiRequest<{ ok: true; tasks: Task[]; usuario: string }>(`${BASE}/tasks`),

    /** Acabadas hace más de un día: no salen de `getTasks` (ver
     *  `listar_tasks` en el backend), pero siguen existiendo para consultar
     *  el historial -- no se borran, las métricas las necesitan. */
    getTasksArchivadas: () =>
      apiRequest<{ ok: true; tasks: Task[] }>(`${BASE}/tasks/archivadas`),

    createTask: (datos: Partial<Task> & { administrativo?: boolean }) =>
      post<{ ok: true; task: Task }>("/tasks", datos),

    /** Una tarea entera por id. El calendario solo tiene de ella un resumen
     *  (`CalendarioItem`), y el diálogo de edición necesita el resto. */
    getTask: (id: number) =>
      apiRequest<{ ok: true; task: Task }>(`${BASE}/tasks/${id}`),

    updateTask: (id: number, datos: Partial<Task>) => put<ApiResult>(`/tasks/${id}`, datos),

    deleteTask: (id: number) => del(`/tasks/${id}`),

    // --- Comentarios de una tarea ---
    getTaskComments: (taskId: number) =>
      apiRequest<{ ok: true; comments: TaskComment[] }>(`${BASE}/tasks/${taskId}/comments`),

    createTaskComment: (taskId: number, texto: string) =>
      post<{ ok: true; comment: TaskComment }>(`/tasks/${taskId}/comments`, { texto }),

    // --- Calendario y miembros ---
    getCalendario: (desde: string, hasta: string) =>
      apiRequest<{ ok: true; desde: string; hasta: string; items: CalendarioItem[] }>(
        `${BASE}/calendario?desde=${desde}&hasta=${hasta}`,
      ),

    // Todos somos de los tres departamentos: el directorio es del club y no
    // cuelga del departamento. Aquí solo para que los paneles lo pidan por
    // `useApi()` como todo lo demás.
    getMiembros: getMiembrosClub,
    getFichaMiembro,
    updateFichaMiembro,

    // --- Registros (presupuesto, reuniones, servicios) ---
    // Un solo juego de métodos para todos: el backend los sirve con el
    // mismo CRUD y solo cambian los campos que se le mandan.

    /** Con `deptos`, las de todos ellos en una sola petición. */
    listarRegistros: (recurso: Recurso, deptos?: Team[]) =>
      apiRequest<{ ok: true } & Record<string, Registro[]>>(
        `${BASE}/${recurso}${deptos?.length ? `?deptos=${deptos.join(",")}` : ""}`,
      ),

    crearRegistro: (recurso: Recurso, datos: Record<string, unknown>) =>
      post<{ ok: true; registro: Registro }>(`/${recurso}`, datos),

    actualizarRegistro: (recurso: Recurso, id: number, datos: Record<string, unknown>) =>
      put<ApiResult>(`/${recurso}/${id}`, datos),

    eliminarRegistro: (recurso: Recurso, id: number) => del(`/${recurso}/${id}`),

    getResumenPresupuesto: () =>
      apiRequest<{ ok: true; resumen: ResumenPresupuesto }>(`${BASE}/presupuesto/resumen`),

    // Solo responde en /api/ingenieria: para los otros dos departamentos es 404.
    getPlataforma: () => apiRequest<{ ok: true } & EstadoPlataforma>(`${BASE}/plataforma`),
  };
}

export type ApiDepto = ReturnType<typeof apiDepto>;
