import type { ApiFailure } from "../types/api";

/** Se lanza en `window` cuando la sesión ya no es la que pinta la página:
 *  un 401 (cuenta desactivada, borrada o sin admin con la sesión abierta) o un
 *  cambio en `X-Equipo-Admin` (le han dado o quitado el admin). EquipoPage
 *  vuelve a pedir la sesión y se pone al día. */
export const REVISAR_SESION = "equipo:revisar-sesion";

// El último `X-Equipo-Admin` visto: solo se avisa cuando cambia.
let ultimoAdmin: string | null = null;

function avisarSiCambiaLaSesion(response: Response) {
  if (typeof window === "undefined") return;
  const admin = response.headers.get("X-Equipo-Admin");
  const cambiaAdmin = admin !== null && ultimoAdmin !== null && admin !== ultimoAdmin;
  if (admin !== null) ultimoAdmin = admin;
  if (response.status === 401 || cambiaAdmin) {
    window.dispatchEvent(new Event(REVISAR_SESION));
  }
}

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

  avisarSiCambiaLaSesion(response);

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
