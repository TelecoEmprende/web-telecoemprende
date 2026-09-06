import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarketingDashboard } from "./MarketingDashboard";
import type { Prioridad, TaskEstado } from "../../types/marketing";

const getCampaigns = vi.fn();
const getCampaign = vi.fn();
const getTasks = vi.fn();
const getCalendario = vi.fn();
const getMiembros = vi.fn();
const updateTask = vi.fn();
const createTask = vi.fn();

vi.mock("../../api/marketing", () => ({
  getCampaigns: (...args: unknown[]) => getCampaigns(...args),
  getCampaign: (...args: unknown[]) => getCampaign(...args),
  getTasks: (...args: unknown[]) => getTasks(...args),
  getCalendario: (...args: unknown[]) => getCalendario(...args),
  getMiembros: (...args: unknown[]) => getMiembros(...args),
  updateTask: (...args: unknown[]) => updateTask(...args),
  createTask: (...args: unknown[]) => createTask(...args),
  createCampaign: vi.fn(),
  createContent: vi.fn(),
  deleteCampaign: vi.fn(),
  deleteContent: vi.fn(),
  deleteTask: vi.fn(),
  updateCampaign: vi.fn(),
  updateContent: vi.fn(),
}));

// El selector de equipo del sidebar lee la sesión: sin esto el test hace una
// petición de verdad contra jsdom.
vi.mock("../../api/equipo", () => ({
  getEquipoSession: () =>
    Promise.resolve({ ok: true, authenticated: true, teams: ["marketing"] }),
  logoutEquipo: () => Promise.resolve({ ok: true }),
  loginEquipo: vi.fn(),
}));

const YO = "abril@telecoemprende.es";

/** Fecha ISO a N días de hoy, para que los tests no caduquen. */
function enDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${String(d.getDate()).padStart(2, "0")}`;
}

const TAREA = {
  id: 1,
  departamento: "marketing",
  campaign_id: 1,
  content_id: 1,
  titulo: "Escribir guion",
  descripcion: "",
  estado: "pendiente" as TaskEstado,
  prioridad: "media" as Prioridad,
  deadline: enDias(2),
  responsables: [] as string[],
  tags: [],
  checklist: [],
  enlaces: [],
  creado_por: YO,
  created_at: "2026-09-06T10:00:00",
  updated_at: "2026-09-06T10:00:00",
  content_titulo: "Reel: cómo empezar a invertir",
  campaign_nombre: "Cómo empezar a invertir",
};

function tareas(...lista: Partial<typeof TAREA>[]) {
  return lista.map((t, i) => ({ ...TAREA, id: i + 1, ...t }));
}

describe("MarketingDashboard", () => {
  beforeEach(() => {
    getCampaigns.mockReset().mockResolvedValue({ ok: true, campaigns: [] });
    getCampaign.mockReset();
    getTasks.mockReset().mockResolvedValue({ ok: true, tasks: [], usuario: YO });
    getCalendario
      .mockReset()
      .mockResolvedValue({ ok: true, desde: "", hasta: "", items: [] });
    getMiembros.mockReset().mockResolvedValue({ ok: true, miembros: [] });
    updateTask.mockReset().mockResolvedValue({ ok: true });
    createTask.mockReset().mockResolvedValue({ ok: true, task: TAREA });
  });

  it("abre en Home, no en el listado de miembros", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });

    render(<MarketingDashboard />);

    // La pregunta con la que entra el usuario, no la estructura de los datos.
    expect(await screen.findByText(/cosa pendiente|cosas pendientes/)).toBeInTheDocument();
    // El resumen de campañas en marcha sí es parte de Home; Miembros no.
    expect(getCampaigns).toHaveBeenCalled();
    expect(getMiembros).not.toHaveBeenCalled();
  });

  it("separa lo vencido y ordena lo demás por día en el timeline", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas(
        { titulo: "Grabar", deadline: enDias(-3) },
        { titulo: "Editar", deadline: enDias(0) },
        { titulo: "Revisar", deadline: enDias(4) },
      ),
    });

    render(<MarketingDashboard />);

    // Vencidas sigue siendo su propio grupo, con encabezado real.
    expect(await screen.findByRole("heading", { name: /Vencidas/ })).toBeInTheDocument();
    expect(screen.getByText(/1 ya vencida/)).toBeInTheDocument();
    // El resto se agrupa por día en el timeline, no por "próximos 7 días".
    // ("Hoy" sale dos veces: la etiqueta del día y la fecha de la propia
    // tarea de ese día.)
    expect(screen.getAllByText("Hoy").length).toBeGreaterThan(0);
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Revisar")).toBeInTheDocument();
  });

  it("cada tarea dice de qué contenido cuelga", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });

    render(<MarketingDashboard />);

    // Sin esto el usuario ve cuatro filas llamadas "Guion" sin saber de cuál.
    expect(
      await screen.findByText("Reel: cómo empezar a invertir"),
    ).toBeInTheDocument();
  });

  it("'Solo lo mío' filtra por responsable", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas(
        { titulo: "Lo mío", responsables: [YO] },
        { titulo: "De otra persona", responsables: ["hugo@upm.es"] },
      ),
    });

    render(<MarketingDashboard />);
    expect(await screen.findByText("De otra persona")).toBeInTheDocument();

    await userEvent.click(screen.getAllByLabelText(/Solo lo mío/i)[0]);

    expect(screen.getByText("Lo mío")).toBeInTheDocument();
    expect(screen.queryByText("De otra persona")).not.toBeInTheDocument();
  });

  it("dice qué falta para publicar un contenido", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas(
        { content_id: 7, estado: "pendiente" },
        { content_id: 7, estado: "acabado" },
      ),
    });
    getCalendario.mockResolvedValue({
      ok: true,
      desde: "",
      hasta: "",
      items: [
        {
          origen: "content",
          id: 7,
          titulo: "Reel: cómo empezar a invertir",
          fecha: enDias(3),
          estado: "en_diseno",
          campaign_id: 1,
          detalle: "instagram",
          prioridad: null,
          padre: "Cómo empezar a invertir",
        },
      ],
    });

    render(<MarketingDashboard />);

    // La publicación aparece como hito en su día del timeline, no en una
    // lista aparte. (El texto se repite: también es el "padre" de sus
    // propias tareas en la misma pantalla.)
    await screen.findByText("Falta 1 tarea");
    expect(screen.getAllByText("Reel: cómo empezar a invertir").length).toBeGreaterThan(0);
  });

  it("carga las tareas al ir al tablero y las coloca en su columna", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas({ titulo: "Escribir guion" }, { titulo: "Grabar", estado: "acabado" }),
    });

    render(<MarketingDashboard />);
    await screen.findByText(/cosa pendiente|cosas pendientes/);

    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    // Las tarjetas son botones que abren la tarea en grande, estilo Trello.
    expect(await screen.findByRole("button", { name: /Escribir guion/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeInTheDocument();
  });

  it("al pulsar una tarea se abre en grande con su contenido", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });

    render(<MarketingDashboard />);
    await screen.findByText(/cosa pendiente|cosas pendientes/);
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    await userEvent.click(
      await screen.findByRole("button", { name: /Escribir guion/ }),
    );

    // Antes solo se podía cambiar estado o borrar; ahora se edita todo.
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Título")).toHaveValue("Escribir guion");
    expect(within(dialogo).getByLabelText("Descripción")).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("Estado")).toHaveValue("pendiente");
  });

  it("borrar una tarea pide confirmación en la página, sin window.confirm", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });
    const confirmSpy = vi.spyOn(window, "confirm");

    render(<MarketingDashboard />);
    await screen.findByText(/cosa pendiente|cosas pendientes/);
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));
    await userEvent.click(
      await screen.findByRole("button", { name: /Escribir guion/ }),
    );

    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Eliminar tarea" }));

    expect(within(dialogo).getByRole("button", { name: "Sí" })).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("muestra los avatares de los responsables", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas({ responsables: [YO, "hugo@telecoemprende.es"] }),
    });

    render(<MarketingDashboard />);
    await screen.findByText(/cosa pendiente|cosas pendientes/);

    // La foto se deduce del email contra las imágenes de public/.
    const avatares = await screen.findAllByLabelText(/Responsables:/);
    expect(avatares.length).toBeGreaterThan(0);
  });

  it("el calendario deja crear una tarea desde un día", async () => {
    render(<MarketingDashboard />);
    await screen.findByText(/Nada pendiente/);

    await userEvent.click(screen.getByRole("button", { name: "Calendario" }));

    const dia = await screen.findByRole("button", { name: /^Añadir tarea el 15 de/ });
    await userEvent.click(dia);

    const campo = await screen.findByLabelText(/Título de la tarea para el 15/);
    await userEvent.type(campo, "Diseñar cartel{Enter}");

    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: "Diseñar cartel" }),
      ),
    );
  });

  it("lista los miembros del departamento", async () => {
    getMiembros.mockResolvedValue({
      ok: true,
      miembros: [{ email: YO, equipos: ["marketing"], activo: true }],
    });

    render(<MarketingDashboard />);
    await screen.findByText(/Nada pendiente/);

    await userEvent.click(screen.getByRole("button", { name: "Miembros" }));

    const panel = await screen.findByRole("heading", { name: "Miembros de Marketing" });
    expect(panel).toBeInTheDocument();
    expect(await screen.findByText(YO)).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay campañas", async () => {
    render(<MarketingDashboard />);
    await screen.findByText(/Nada pendiente/);

    await userEvent.click(screen.getByRole("button", { name: "Campañas" }));

    expect(await screen.findByText(/Aún no hay campañas/)).toBeInTheDocument();
  });

  it("la navegación marca la pestaña activa", async () => {
    render(<MarketingDashboard />);
    await screen.findByText(/Nada pendiente/);

    const nav = screen.getByRole("navigation", { name: "Secciones de Marketing" });
    expect(within(nav).getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    // fireEvent y no userEvent: el TooltipTrigger de Radix se traga el primer
    // clic sintético en jsdom y el test fallaba de forma intermitente.
    fireEvent.click(within(nav).getByRole("button", { name: "Calendario" }));
    expect(within(nav).getByRole("button", { name: "Calendario" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});
