import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type {
  CalendarioItem,
  FichaMiembro,
  CampaignDetalle,
  CampaignResumen,
  Content,
  Miembro,
  Task,
  TaskComment,
} from "../types/marketing";
import type { Team } from "../types/equipo";
import type { Recurso, Registro, ResumenPresupuesto } from "../types/registros";

/**
 * Cliente del workspace de un departamento.
 *
 * Marketing y Eventos comparten API (el mismo blueprint registrado dos veces
 * en el backend), y lo único que las separa es el prefijo de la ruta. Por eso
 * esto es una factoría y no un módulo de funciones sueltas: los paneles no
 * tienen que ir pasando el departamento en cada llamada, lo reciben ya atado
 * vía `useApi()` (ver `DeptoApi.tsx`).
 */
export function apiDepto(depto: Team) {
  const BASE = `/api/${depto}`;

  const post = <T,>(ruta: string, body: unknown) =>
    apiRequest<T>(`${BASE}${ruta}`, { method: "POST", body: JSON.stringify(body) });

  const put = <T,>(ruta: string, body: unknown) =>
    apiRequest<T>(`${BASE}${ruta}`, { method: "PUT", body: JSON.stringify(body) });

  const del = (ruta: string) =>
    apiRequest<ApiResult>(`${BASE}${ruta}`, { method: "DELETE" });

  return {
    // --- Campaigns ---
    getCampaigns: () =>
      apiRequest<{ ok: true; campaigns: CampaignResumen[] }>(`${BASE}/campaigns`),

    getCampaign: (id: number) =>
      apiRequest<{ ok: true; campaign: CampaignDetalle }>(`${BASE}/campaigns/${id}`),

    createCampaign: (datos: {
      nombre: string;
      objetivo?: string;
      audiencia?: string;
      fecha?: string | null;
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

    createTask: (datos: Partial<Task>) => post<{ ok: true; task: Task }>("/tasks", datos),

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

    getMiembros: () => apiRequest<{ ok: true; miembros: Miembro[] }>(`${BASE}/miembros`),

    getFichaMiembro: (email: string) =>
      apiRequest<{ ok: true; ficha: FichaMiembro }>(
        `${BASE}/miembros/ficha?email=${encodeURIComponent(email)}`,
      ),

    updateFichaMiembro: (email: string, datos: { tags?: string[]; notas?: string }) =>
      put<ApiResult>("/miembros/ficha", { email, ...datos }),

    // --- Registros (recursos, presupuesto, anuncios, reuniones, alumni) ---
    // Un solo juego de métodos para las cinco: el backend las sirve con el
    // mismo CRUD y solo cambian los campos que se le mandan.

    listarRegistros: (recurso: Recurso) =>
      apiRequest<{ ok: true } & Record<string, Registro[]>>(`${BASE}/${recurso}`),

    crearRegistro: (recurso: Recurso, datos: Record<string, unknown>) =>
      post<{ ok: true; registro: Registro }>(`/${recurso}`, datos),

    actualizarRegistro: (recurso: Recurso, id: number, datos: Record<string, unknown>) =>
      put<ApiResult>(`/${recurso}/${id}`, datos),

    eliminarRegistro: (recurso: Recurso, id: number) => del(`/${recurso}/${id}`),

    getResumenPresupuesto: () =>
      apiRequest<{ ok: true; resumen: ResumenPresupuesto }>(`${BASE}/presupuesto/resumen`),
  };
}

export type ApiDepto = ReturnType<typeof apiDepto>;
