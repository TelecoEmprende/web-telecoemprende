import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SelectorMiembros } from "./SelectorMiembros";

const getMiembros = vi.fn();

vi.mock("../DeptoApi", () => ({
  useApi: () => ({ getMiembros }),
}));

describe("SelectorMiembros", () => {
  beforeEach(() => {
    getMiembros.mockReset().mockResolvedValue({
      ok: true,
      miembros: [
        { email: "abril@example.com", equipos: ["marketing"], activo: true, tags: [], abiertas: 0 },
        { email: "hugo@example.com", equipos: ["marketing"], activo: true, tags: [], abiertas: 0 },
      ],
    });
  });

  it("elige a alguien del roster y lo añade a la selección", async () => {
    const onCambiar = vi.fn();
    render(<SelectorMiembros seleccionados={[]} onCambiar={onCambiar} />);

    await userEvent.click(screen.getByRole("button", { name: /Elegir personas/ }));
    await userEvent.click(await screen.findByText("Hugo"));

    expect(onCambiar).toHaveBeenCalledWith(["hugo@example.com"]);
  });

  it("quita a alguien ya elegido al volver a tocarlo", async () => {
    const onCambiar = vi.fn();
    render(<SelectorMiembros seleccionados={["hugo@example.com"]} onCambiar={onCambiar} />);

    // Con alguien ya elegido, su nombre sale tanto en el disparador como en
    // la fila del popover -- se distingue por su casilla, no por el texto.
    await userEvent.click(screen.getByRole("button"));
    const casillaHugo = (await screen.findAllByRole("checkbox"))[1];
    await userEvent.click(casillaHugo);

    expect(onCambiar).toHaveBeenCalledWith([]);
  });

  it("sin roster disponible, no rompe: se queda sin opciones que elegir", async () => {
    getMiembros.mockRejectedValue(new Error("fallo de red"));
    render(<SelectorMiembros seleccionados={[]} onCambiar={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Elegir personas/ }));

    expect(await screen.findByText(/Nadie en el equipo/)).toBeInTheDocument();
  });
});
