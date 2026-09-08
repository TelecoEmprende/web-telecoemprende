import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SuscribirCalendario } from "./SuscribirCalendario";

describe("SuscribirCalendario", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it("copia el enlace al portapapeles y lo enseña, sin abrir ninguna pestaña", async () => {
    const url = "https://telecoemprende.es/api/equipo/calendario.ics?email=x&token=y";
    const obtenerEnlace = vi.fn().mockResolvedValue({ url });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<SuscribirCalendario obtenerEnlace={obtenerEnlace} onError={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "📅 Suscribirse" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(await screen.findByText(/Enlace copiado/)).toBeInTheDocument();
    expect(screen.getByText(url)).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("avisa del error si no se puede generar el enlace", async () => {
    const obtenerEnlace = vi.fn().mockRejectedValue({ message: "fallo de red" });
    const onError = vi.fn();

    render(<SuscribirCalendario obtenerEnlace={obtenerEnlace} onError={onError} />);
    await userEvent.click(screen.getByRole("button", { name: "📅 Suscribirse" }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("fallo de red"));
  });
});
