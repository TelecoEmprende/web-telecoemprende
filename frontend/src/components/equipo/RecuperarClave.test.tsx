import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CambiarClaveObligatorio, ElegirClaveNueva, PedirEnlaceClave } from "./RecuperarClave";

const olvideClave = vi.fn();
const restablecerClave = vi.fn();
const cambiarPassword = vi.fn();

vi.mock("../../api/equipo", () => ({
  olvideClave: (...a: unknown[]) => olvideClave(...a),
  restablecerClave: (...a: unknown[]) => restablecerClave(...a),
  cambiarPassword: (...a: unknown[]) => cambiarPassword(...a),
}));

describe("recuperar la contraseña", () => {
  beforeEach(() => {
    olvideClave.mockReset().mockResolvedValue({ ok: true });
    restablecerClave.mockReset().mockResolvedValue({ ok: true });
    cambiarPassword.mockReset().mockResolvedValue({ ok: true });
  });

  it("pide el enlace y dice lo mismo exista o no la cuenta", async () => {
    render(<PedirEnlaceClave onVolver={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Email"), "ana@alumnos.upm.es");
    await userEvent.click(screen.getByRole("button", { name: /Enviarme el enlace/ }));

    expect(olvideClave).toHaveBeenCalledWith("ana@alumnos.upm.es");
    expect(await screen.findByText(/Si hay una cuenta con/)).toBeInTheDocument();
    // Y por si el correo no llega: la salida es un admin.
    expect(screen.getByText(/contraseña provisional/)).toBeInTheDocument();
  });

  it("elige contraseña nueva con el token del enlace", async () => {
    const onHecho = vi.fn();
    render(<ElegirClaveNueva token="abc123" onHecho={onHecho} />);
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "otra-clave-9");
    await userEvent.click(screen.getByRole("button", { name: /Guardar contraseña/ }));

    expect(restablecerClave).toHaveBeenCalledWith("abc123", "otra-clave-9");
    await userEvent.click(await screen.findByRole("button", { name: /Ir a entrar/ }));
    expect(onHecho).toHaveBeenCalled();
  });

  it("un enlace que no vale enseña el motivo del servidor", async () => {
    restablecerClave.mockRejectedValue({ ok: false, message: "El enlace no vale: ha caducado." });
    render(<ElegirClaveNueva token="viejo" onHecho={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "otra-clave-9");
    await userEvent.click(screen.getByRole("button", { name: /Guardar contraseña/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ha caducado");
  });

  it("la contraseña provisional obliga a cambiarla antes de seguir", async () => {
    const onHecho = vi.fn();
    render(<CambiarClaveObligatorio onHecho={onHecho} />);
    await userEvent.type(screen.getByLabelText("La que acabas de usar"), "provisional1");
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "la-mia-12345");
    await userEvent.click(screen.getByRole("button", { name: /Guardar y entrar/ }));

    expect(cambiarPassword).toHaveBeenCalledWith("provisional1", "la-mia-12345");
    expect(onHecho).toHaveBeenCalled();
  });
});
