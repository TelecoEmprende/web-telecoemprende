import type { ApiFailure } from "../types/api";

function resolveRequestUrl(input: string) {
  if (typeof window === "undefined") {
    return input;
  }

  return new URL(input, window.location.href).toString();
}

export async function apiRequest<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = init;
  const hasBody = rest.body !== undefined;

  // Los fallos que no son del backend (sin red, una página de error de Vercel)
  // llegan con la misma forma que los suyos, y en español: es lo que se enseña.
  let response: Response;
  try {
    response = await fetch(resolveRequestUrl(input), {
      credentials: "include",
      ...rest,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });
  } catch {
    throw {
      ok: false,
      message: "Sin conexión con el servidor. Revisa la red e inténtalo otra vez.",
      reintentable: true,
    } satisfies ApiFailure;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw {
      ok: false,
      message: `El servidor no ha respondido bien (error ${response.status}). Inténtalo otra vez.`,
      reintentable: true,
    } satisfies ApiFailure;
  }

  const data = (await response.json()) as T | ApiFailure;

  if (!response.ok) {
    throw response.status >= 500 ? { ...(data as ApiFailure), reintentable: true } : data;
  }

  return data as T;
}
