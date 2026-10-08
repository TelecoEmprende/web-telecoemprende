import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotasDelProyecto } from "./NotasDelProyecto";

const actualizarNota = vi.fn();
const crearNota = vi.fn();

const nota = (id: number, titulo: string, proyecto_id: number | null, checks_pendientes = 0) => ({
  id, titulo, proyecto_id, checks_pendientes, checks_hechos: 0, resumen: "", pendientes: [],
  departamento: "", privada: false, fijada: false, creado_por: "", editado_por: "",
  created_at: "", updated_at: "",
});

vi.mock("../../../api/notas", () => ({
  listarNotas: () =>
    Promise.resolve({ ok: true, notas: [nota(1, "Guion", 7, 2), nota(2, "Ideas sueltas", null), nota(3, "De otro", 9)] }),
  actualizarNota: (...args: unknown[]) => actualizarNota(...args),
  crearNota: (...args: unknown[]) => crearNota(...args),
}));

describe("Notas de un proyecto", () => {
  beforeEach(() => {
    actualizarNota.mockReset().mockResolvedValue({ ok: true });
    crearNota.mockReset().mockResolvedValue({ ok: true, nota: { id: 42 } });
  });

  it("lista solo las suyas, abre, enlaza y crea notas ya enlazadas", async () => {
    const onAbrirNota = vi.fn();
    render(
      <NotasDelProyecto proyectoId={7} proyectoNombre="Charla YC" departamento="marketing" onAbrirNota={onAbrirNota} />,
    );

    await userEvent.click(await screen.findByRole("button", { name: /^Guion/ }));
    expect(onAbrirNota).toHaveBeenCalledWith(1);
    expect(screen.getByText("2 pendientes")).toBeInTheDocument();
    expect(screen.queryByText("De otro")).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Nota que enlazar a este proyecto"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Enlazar" }));
    expect(actualizarNota).toHaveBeenCalledWith(2, { proyecto_id: 7 });

    await userEvent.click(screen.getByRole("button", { name: "+ Nueva nota" }));
    expect(crearNota).toHaveBeenCalledWith({ titulo: "Charla YC", departamento: "marketing", proyecto_id: 7 });
    expect(onAbrirNota).toHaveBeenCalledWith(42);
  });
});
