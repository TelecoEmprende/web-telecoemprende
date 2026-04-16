import type { ApiFailure } from "../types/api";

type RequestOptions = RequestInit & {
  expectJson?: boolean;
};

function resolveRequestUrl(input: string) {
  if (typeof window === "undefined") {
    return input;
  }

  return new URL(input, window.location.href).toString();
}

export async function apiRequest<T>(
  input: string,
  init: RequestOptions = {},
): Promise<T> {
  const { expectJson = true, headers, ...rest } = init;
  const hasBody = rest.body !== undefined;

  const response = await fetch(resolveRequestUrl(input), {
    credentials: "include",
    ...rest,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  });

  if (!expectJson) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response as T;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Unexpected response type: ${contentType || "unknown"}`);
  }

  const data = (await response.json()) as T | ApiFailure;

  if (!response.ok) {
    throw data;
  }

  return data as T;
}
