import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type {
  CalendarioItem,
  CampaignDetalle,
  CampaignResumen,
  Content,
  Miembro,
  Task,
} from "../types/marketing";
import type { Team } from "../types/equipo";

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

    // --- Calendario y miembros ---
    getCalendario: (desde: string, hasta: string) =>
      apiRequest<{ ok: true; desde: string; hasta: string; items: CalendarioItem[] }>(
        `${BASE}/calendario?desde=${desde}&hasta=${hasta}`,
      ),

    getMiembros: () => apiRequest<{ ok: true; miembros: Miembro[] }>(`${BASE}/miembros`),

    getEnlaceCalendario: () =>
      apiRequest<{ ok: true; url: string }>(`${BASE}/calendario/enlace`),
  };
}

export type ApiDepto = ReturnType<typeof apiDepto>;
