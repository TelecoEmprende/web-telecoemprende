import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarioEquipo } from "./CalendarioEquipo";

const getEquipoCalendario = vi.fn();
const getEquipoSession = vi.fn();
const getMisTareas = vi.fn();

vi.mock("../../api/equipo", () => ({
  getEquipoCalendario: () => getEquipoCalendario(),
  getEquipoSession: () => getEquipoSession(),
  getMisTareas: () => getMisTareas(),
}));

describe("CalendarioEquipo — tu agenda", () => {
  beforeEach(() => {
    getEquipoCalendario.mockReset().mockResolvedValue({ ok: true, eventos: [] });
    getMisTareas.mockReset().mockResolvedValue({ ok: true, tareas: [] });
  });

  it("no pide ni muestra la agenda con un solo departamento", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing"], vp_de: [], cargo: "",
      email: "abril@example.com",
    });

    render(<CalendarioEquipo />);

    await screen.findByText("Hoy");
    expect(screen.queryByText(/^Hola,/)).not.toBeInTheDocument();
    expect(getMisTareas).not.toHaveBeenCalled();
  });

  it("con varios departamentos, saluda y junta sus tareas por departamento", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing", "eventos"], vp_de: [], cargo: "",
      email: "abril@example.com",
    });
    getMisTareas.mockResolvedValue({
      ok: true,
      tareas: [
        { id: 1, departamento: "marketing", titulo: "Escribir guion", deadline: null },
        { id: 2, departamento: "eventos", titulo: "Reservar sala", deadline: null },
      ],
    });

    render(<CalendarioEquipo />);

    expect(await screen.findByText("Hola, Abril 👋")).toBeInTheDocument();
    expect(await screen.findByText("Escribir guion")).toBeInTheDocument();
    expect(screen.getByText("Reservar sala")).toBeInTheDocument();
    // "Marketing"/"Eventos" salen dos veces cada uno: en la fila de la tarea
    // y en la leyenda de abajo.
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Eventos").length).toBeGreaterThan(0);
  });

  it("marca como vencida una tarea con deadline pasado", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing", "eventos"], vp_de: [], cargo: "",
      email: "abril@example.com",
    });
    getMisTareas.mockResolvedValue({
      ok: true,
      tareas: [{ id: 1, departamento: "marketing", titulo: "Guion", deadline: "2020-01-01" }],
    });

    render(<CalendarioEquipo />);

    const cuando = await screen.findByText(/Hace \d+ días/);
    expect(cuando).toHaveClass("mkt-agenda-vencida-react");

    // Antes el saludo solo contaba hoy/mañana: con una única tarea ya
    // vencida y nada para hoy o mañana, decía "ninguna cosa" -- que se lee
    // como "vas al día" siendo mentira.
    expect(await screen.findByText(/1 cosa pendiente/)).toBeInTheDocument();
  });
});
