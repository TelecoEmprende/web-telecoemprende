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

const BASE = "/api/marketing";

function post<T>(ruta: string, body: unknown) {
  return apiRequest<T>(`${BASE}${ruta}`, { method: "POST", body: JSON.stringify(body) });
}

function put<T>(ruta: string, body: unknown) {
  return apiRequest<T>(`${BASE}${ruta}`, { method: "PUT", body: JSON.stringify(body) });
}

function del(ruta: string) {
  return apiRequest<ApiResult>(`${BASE}${ruta}`, { method: "DELETE" });
}

// --- Campaigns ---

export function getCampaigns() {
  return apiRequest<{ ok: true; campaigns: CampaignResumen[] }>(`${BASE}/campaigns`);
}

export function getCampaign(id: number) {
  return apiRequest<{ ok: true; campaign: CampaignDetalle }>(`${BASE}/campaigns/${id}`);
}

export function createCampaign(datos: {
  nombre: string;
  objetivo?: string;
  audiencia?: string;
  fecha?: string | null;
}) {
  return post<{ ok: true; campaign: CampaignResumen }>("/campaigns", datos);
}

export function updateCampaign(id: number, datos: Partial<CampaignResumen>) {
  return put<ApiResult>(`/campaigns/${id}`, datos);
}

export function deleteCampaign(id: number) {
  return del(`/campaigns/${id}`);
}

// --- Contents ---

export function createContent(campaignId: number, datos: Partial<Content>) {
  return post<{ ok: true; content: Content }>(`/campaigns/${campaignId}/contents`, datos);
}

export function updateContent(id: number, datos: Partial<Content>) {
  return put<ApiResult>(`/contents/${id}`, datos);
}

export function deleteContent(id: number) {
  return del(`/contents/${id}`);
}

// --- Tasks ---

export function getTasks() {
  return apiRequest<{ ok: true; tasks: Task[]; usuario: string }>(`${BASE}/tasks`);
}

export function createTask(datos: Partial<Task>) {
  return post<{ ok: true; task: Task }>("/tasks", datos);
}

export function updateTask(id: number, datos: Partial<Task>) {
  return put<ApiResult>(`/tasks/${id}`, datos);
}

export function deleteTask(id: number) {
  return del(`/tasks/${id}`);
}

// --- Calendario y miembros ---

export function getCalendario(desde: string, hasta: string) {
  return apiRequest<{ ok: true; desde: string; hasta: string; items: CalendarioItem[] }>(
    `${BASE}/calendario?desde=${desde}&hasta=${hasta}`,
  );
}

export function getMiembros() {
  return apiRequest<{ ok: true; miembros: Miembro[] }>(`${BASE}/miembros`);
}

export function getEnlaceCalendario() {
  return apiRequest<{ ok: true; url: string }>(`${BASE}/calendario/enlace`);
}
