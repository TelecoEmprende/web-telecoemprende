import { afterEach, describe, expect, it, vi } from "vitest";

import { REVISAR_SESION, apiRequest } from "./client";

function responder(status: number, admin?: "0" | "1") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: status < 400, message: "No autorizado." }), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...(admin ? { "X-Equipo-Admin": admin } : {}),
        },
      }),
    ),
  );
}

describe("apiRequest avisa de que la sesión ha cambiado", () => {
  afterEach(() => vi.unstubAllGlobals());

  // EquipoPage escucha REVISAR_SESION para sacar a una cuenta desactivada, o
  // quitarle o darle el grupo Admin, en ese mismo clic.
  it("en un 401 y cuando cambia X-Equipo-Admin; no en un 403 ni si sigue igual", async () => {
    const aviso = vi.fn();
    window.addEventListener(REVISAR_SESION, aviso);

    responder(403, "0");
    await expect(apiRequest("/api/equipo/metricas")).rejects.toMatchObject({ ok: false });
    responder(200, "0");
    await apiRequest("/api/equipo/mesa");
    expect(aviso).not.toHaveBeenCalled();

    responder(200, "1");
    await apiRequest("/api/equipo/mesa");
    expect(aviso).toHaveBeenCalledTimes(1);

    responder(401);
    await expect(apiRequest("/api/equipo/mesa")).rejects.toMatchObject({ message: "No autorizado." });
    expect(aviso).toHaveBeenCalledTimes(2);

    window.removeEventListener(REVISAR_SESION, aviso);
  });
});
