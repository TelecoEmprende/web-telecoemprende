import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarioEquipo } from "./CalendarioEquipo";

const getEquipoCalendario = vi.fn();
const getEquipoSession = vi.fn();
const getMisTareas = vi.fn();
const getMisProyectos = vi.fn();
const getMiembrosClub = vi.fn();
const getEventosLuma = vi.fn();
const getCalendarioEquipo = vi.fn();

vi.mock("../../api/notas", () => ({
  listarNotas: () => Promise.resolve({ ok: true, notas: [] }),
}));

vi.mock("../../api/equipo", () => ({
  getEquipoCalendario: () => getEquipoCalendario(),
  getEquipoSession: () => getEquipoSession(),
  getMisTareas: () => getMisTareas(),
  getMisProyectos: () => getMisProyectos(),
  getEventosLuma: () => getEventosLuma(),
  getCalendarioEquipo: (...args: unknown[]) => getCalendarioEquipo(...args),
}));

// Sin mock, `apiDepto` haría peticiones de verdad contra jsdom.
vi.mock("../../api/marketing", () => ({
  getMiembrosClub: () => getMiembrosClub(),
  apiDepto: () => ({
  }),
}));

describe("CalendarioEquipo — tu agenda", () => {
  beforeEach(() => {
    getEquipoCalendario.mockReset().mockResolvedValue({ ok: true, eventos: [] });
    getMisTareas.mockReset().mockResolvedValue({ ok: true, tareas: [] });
    getMisProyectos.mockReset().mockResolvedValue({ ok: true, proyectos: [] });
    getMiembrosClub.mockReset().mockResolvedValue({ ok: true, miembros: [] });
    getEventosLuma.mockReset().mockResolvedValue({ ok: true, calendario: "", eventos: [] });
    getCalendarioEquipo.mockReset().mockResolvedValue({ ok: true, desde: "", hasta: "", items: [] });
  });

  it("la rejilla de la semana enseña las reuniones, de la misma fuente que el Calendario", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing"], vp_de: [], cargo: "",
      email: "abril@example.com", nombre: "Abril",
    });
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    getCalendarioEquipo.mockResolvedValue({
      ok: true, desde: "", hasta: "",
      items: [
        { origen: "reunion", id: 7, titulo: "Junta semanal", fecha, hora: "18:00" },
        { origen: "task", id: 8, titulo: "No soy reunión", fecha, hora: null },
      ],
    });

    render(<CalendarioEquipo onIrA={() => {}} />);

    expect(await screen.findByText("Junta semanal 18:00")).toBeInTheDocument();
    expect(screen.queryByText(/No soy reunión/)).not.toBeInTheDocument();
  });

  it("los eventos de Luma salen en «Esta semana», con su enlace, y no hay tarjeta de pendientes", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing"], vp_de: [], cargo: "",
      email: "abril@example.com", nombre: "Abril",
    });
    const hoy = new Date();
    hoy.setHours(18, 30, 0, 0);
    getEventosLuma.mockResolvedValue({
      ok: true,
      calendario: "https://luma.com/alumni.etsit.upm",
      eventos: [{ id: "e1", titulo: "Conversaciones alumni", inicio: hoy.toISOString(), lugar: "ETSIT", url: "https://luma.com/e1" }],
    });

    render(<CalendarioEquipo onIrA={() => {}} />);

    const enSemana = (await screen.findAllByRole("link", { name: /Conversaciones alumni 18:30/ }))[0];
    expect(enSemana).toHaveAttribute("href", "https://luma.com/e1");
    expect(screen.queryByText("Pendiente en notas")).not.toBeInTheDocument();
  });

  it("saluda y pide la agenda también con un solo departamento", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing"], vp_de: [], cargo: "",
      email: "abril@example.com", nombre: "Abril",
    });
    getMisTareas.mockResolvedValue({
      ok: true,
      tareas: [{ id: 1, departamento: "marketing", titulo: "Escribir guion", deadline: null, responsables: [] }],
    });

    render(<CalendarioEquipo onIrA={() => {}} />);

    expect(await screen.findByText(/^Buenos días, Abril|^Buenas tardes, Abril|^Buenas noches, Abril/)).toBeInTheDocument();
    expect(await screen.findByText("Escribir guion")).toBeInTheDocument();
    expect(getMisTareas).toHaveBeenCalled();
  });

  it("con varios departamentos, saluda y junta sus tareas por departamento", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing", "eventos"], vp_de: [], cargo: "",
      email: "abril@example.com", nombre: "Abril",
    });
    getMisTareas.mockResolvedValue({
      ok: true,
      tareas: [
        { id: 1, departamento: "marketing", titulo: "Escribir guion", deadline: null, responsables: [] },
        { id: 2, departamento: "eventos", titulo: "Reservar sala", deadline: null, responsables: [] },
      ],
    });

    render(<CalendarioEquipo onIrA={() => {}} />);

    expect(await screen.findByText(/^Buenos días, Abril|^Buenas tardes, Abril|^Buenas noches, Abril/)).toBeInTheDocument();
    expect(await screen.findByText("Escribir guion")).toBeInTheDocument();
    expect(screen.getByText("Reservar sala")).toBeInTheDocument();
    // Cada tarea lleva la etiqueta de su departamento en su propia fila.
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Eventos").length).toBeGreaterThan(0);
  });

  it("marca como vencida una tarea con deadline pasado", async () => {
    getEquipoSession.mockResolvedValue({
      ok: true, authenticated: true, teams: ["marketing", "eventos"], vp_de: [], cargo: "",
      email: "abril@example.com", nombre: "Abril",
    });
    getMisTareas.mockResolvedValue({
      ok: true,
      tareas: [{ id: 1, departamento: "marketing", titulo: "Guion", deadline: "2020-01-01", responsables: [] }],
    });

    render(<CalendarioEquipo onIrA={() => {}} />);

    // Con texto y en el rojo de «atrasada», y la cabecera lo cuenta.
    const cuando = await screen.findByText(/Atrasada · hace \d+ días/);
    expect(cuando).toHaveClass("crm-tag-rojo-react");
    expect(screen.getByText(/Semana del .* · 1 tarea atrasada$/)).toBeInTheDocument();
  });
});
