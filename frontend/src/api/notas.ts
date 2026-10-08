import { apiRequest } from "./client";
import type { ApiResult } from "../types/api";
import type { Nota, NotaResumen } from "../types/notas";

const BASE = "/api/equipo";

const enviar = <T,>(ruta: string, method: string, body?: unknown) =>
  apiRequest<T>(`${BASE}${ruta}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const listarNotas = () => apiRequest<ApiResult & { notas: NotaResumen[] }>(`${BASE}/notas`);
export const obtenerNota = (id: number) => apiRequest<ApiResult & { nota: Nota }>(`${BASE}/notas/${id}`);
export const crearNota = (datos: Partial<Nota>) =>
  enviar<ApiResult & { nota: Nota }>("/notas", "POST", { contenido: [], ...datos });
export const actualizarNota = (id: number, datos: Partial<Nota>) =>
  enviar<ApiResult>(`/notas/${id}`, "PUT", datos);
export const eliminarNota = (id: number) => enviar<ApiResult>(`/notas/${id}`, "DELETE");
