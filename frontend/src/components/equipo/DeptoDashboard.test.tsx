import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EquipoPage } from "../../routes/EquipoPage";
import type { Prioridad, Task, TaskEstado } from "../../types/marketing";

const getCampaigns = vi.fn();
const getCampaign = vi.fn();
const getTasks = vi.fn();
const getCalendario = vi.fn();
const getMiembros = vi.fn();
const updateTask = vi.fn();
const createTask = vi.fn();
const getFichaMiembro = vi.fn();
const getSalud = vi.fn();
const listarRegistros = vi.fn();
const updateFichaMiembro = vi.fn();
const duplicateCampaign = vi.fn();
const getTaskComments = vi.fn();
const createTaskComment = vi.fn();
const getCalendarioEquipo = vi.fn();

// El módulo ya no exporta funciones sueltas sino una factoría por
// departamento (Marketing y Eventos comparten paneles). `apiDepto` guarda el
// departamento con el que se le llama, y así el test puede comprobar que cada
// workspace pide los datos de los suyos y no de los del otro.
const deptosPedidos: string[] = [];

vi.mock("../../api/marketing", () => ({
  apiDepto: (depto: string) => {
    deptosPedidos.push(depto);
    return {
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
      duplicateCampaign: (...args: unknown[]) => duplicateCampaign(...args),
      deleteContent: vi.fn(),
      deleteTask: vi.fn(),
      updateCampaign: vi.fn(),
      updateContent: vi.fn(),
      getTaskComments: (...args: unknown[]) => getTaskComments(...args),
      createTaskComment: (...args: unknown[]) => createTaskComment(...args),
      getFichaMiembro: (...args: unknown[]) => getFichaMiembro(...args),
      getSalud: (...args: unknown[]) => getSalud(...args),
      listarRegistros: (...args: unknown[]) => listarRegistros(...args),
      crearRegistro: vi.fn(),
      actualizarRegistro: vi.fn(),
      eliminarRegistro: vi.fn(),
      getResumenPresupuesto: () =>
        Promise.resolve({ ok: true, resumen: { gastos: "0", ingresos: "0", pagado: "0", balance: "0" } }),
      updateFichaMiembro: (...args: unknown[]) => updateFichaMiembro(...args),
    };
  },
}));

// El shell de /equipo lee la sesión y el calendario del club: sin esto el
// test hace peticiones de verdad contra jsdom. Los equipos son mutables porque
// el sidebar sale de la sesión: quien es de Eventos ve otras secciones.
let teamsDeSesion = ["marketing"];
// VP de sus propios equipos por defecto: crear/reasignar tareas ahora exige
// serlo (ver `_puede_asignar_tareas` en el backend), y la mayoría de estos
// tests ejercitan ese flujo, no el límite de permisos en sí.
let vpDeSesion = ["marketing"];

vi.mock("../../api/equipo", () => ({
  getEquipoSession: () =>
    Promise.resolve({
      ok: true,
      authenticated: true,
      teams: teamsDeSesion,
      vp_de: vpDeSesion,
      cargo: "",
      nombre: "",
      mentor_email: "",
    }),
  getEquipoCalendario: () => Promise.resolve({ ok: true, eventos: [] }),
  getCalendarioEquipo: (...args: unknown[]) => getCalendarioEquipo(...args),
  createEquipoCalendarioEvento: vi.fn(),
  getMisTareas: () => Promise.resolve({ ok: true, tareas: [] }),
  getMisProyectos: () => Promise.resolve({ ok: true, proyectos: [] }),
  getDirectorioClub: () => Promise.resolve({ ok: true, miembros: [] }),
  confirmarEventoCalendario: vi.fn(),
  checkinEventoCalendario: vi.fn(),
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
  instrucciones: "Ver notas.",
  estado: "pendiente" as TaskEstado,
  prioridad: "media" as Prioridad,
  deadline: enDias(2),
  hora: "",
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

function tareas(...lista: Partial<Task>[]): Task[] {
  return lista.map((t, i) => ({ ...TAREA, id: i + 1, ...t }));
}

/** Monta /equipo entero. El sidebar es plano (una entrada por panel, no una
 *  por departamento, ver `EquipoSidebar.tsx`): abre en "Mi semana", que es lo
 *  común a todo el mundo, sin ningún "Resumen" de departamento que tocar
 *  antes. */
async function renderMarketing() {
  render(
    <MemoryRouter>
      <EquipoPage />
    </MemoryRouter>,
  );
  await screen.findByText(/tarea vence|tareas vencen|ninguna tarea vence/);
}

describe("/equipo — panel de Marketing", () => {
  beforeEach(() => {
    teamsDeSesion = ["marketing"];
    vpDeSesion = ["marketing"];
    deptosPedidos.length = 0;
    getCampaigns.mockReset().mockResolvedValue({ ok: true, campaigns: [] });
    getCampaign.mockReset();
    getTasks.mockReset().mockResolvedValue({ ok: true, tasks: [], usuario: YO });
    getCalendario
      .mockReset()
      .mockResolvedValue({ ok: true, desde: "", hasta: "", items: [] });
    getMiembros.mockReset().mockResolvedValue({ ok: true, miembros: [] });
    getFichaMiembro.mockReset();
    getSalud
      .mockReset()
      .mockResolvedValue({
        ok: true,
        salud: { total: 0, sobrecargados: 0, inactivos: 0, pct_a_tiempo: null, miembros: [] },
      });
    listarRegistros.mockReset().mockImplementation((recurso: string) =>
      Promise.resolve({ ok: true, [recurso]: [] }),
    );
    updateFichaMiembro.mockReset().mockResolvedValue({ ok: true });
    duplicateCampaign.mockReset();
    updateTask.mockReset().mockResolvedValue({ ok: true });
    createTask.mockReset().mockResolvedValue({ ok: true, task: TAREA });
    getTaskComments.mockReset().mockResolvedValue({ ok: true, comments: [] });
    createTaskComment.mockReset();
    getCalendarioEquipo
      .mockReset()
      .mockResolvedValue({ ok: true, desde: "", hasta: "", items: [] });
  });

  it("carga las tareas al ir al tablero y las coloca en su columna", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas({ titulo: "Escribir guion" }, { titulo: "Grabar", estado: "acabado" }),
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    // Las tarjetas son botones que abren la tarea en grande, estilo Trello.
    expect(await screen.findByRole("button", { name: /Escribir guion/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeInTheDocument();
  });

  it("cada tarjeta dice de qué campaña cuelga", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    // Sin esto el tablero enseña cuatro tarjetas llamadas "Guion" sin decir
    // de cuál reel es cada una.
    expect(
      await screen.findByText("Reel: cómo empezar a invertir"),
    ).toBeInTheDocument();
  });

  it("un miembro raso (no VP) no ve el botón de crear tarea", async () => {
    vpDeSesion = [];

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    expect(screen.queryByRole("button", { name: "+ Nueva tarea" })).not.toBeInTheDocument();
  });

  it("'Solo lo mío' filtra el tablero por responsable", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas(
        { titulo: "Lo mío", responsables: [YO] },
        { titulo: "De otra persona", responsables: ["hugo@upm.es"] },
      ),
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));
    expect(await screen.findByRole("button", { name: /De otra persona/ })).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Solo lo mío/i));

    expect(screen.getByRole("button", { name: /Lo mío/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /De otra persona/ })).not.toBeInTheDocument();
  });

  it("el buscador filtra el tablero por título", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas({ titulo: "Escribir guion" }, { titulo: "Grabar reel" }),
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));
    await screen.findByRole("button", { name: /Escribir guion/ });

    await userEvent.type(screen.getByLabelText("Buscar tareas por título"), "reel");

    expect(screen.getByRole("button", { name: /Grabar reel/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Escribir guion/ })).not.toBeInTheDocument();
  });

  it("arrastrar una tarea a otra columna deja deshacer el movimiento", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas({ id: 1, titulo: "Escribir guion", estado: "pendiente" }),
    });
    updateTask.mockResolvedValue({ ok: true });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));
    const tarjeta = await screen.findByRole("button", { name: /Escribir guion/ });
    const destino = document.querySelector('[data-estado="en_progreso"]') as HTMLElement;

    // jsdom no implementa DataTransfer: un objeto mínimo con las mismas
    // formas de leer/escribir que usa el tablero real basta para el test.
    const datos: Record<string, string> = {};
    const dataTransfer = {
      setData: (tipo: string, valor: string) => {
        datos[tipo] = valor;
      },
      getData: (tipo: string) => datos[tipo] ?? "",
      get types() {
        return Object.keys(datos);
      },
      effectAllowed: "",
    };

    fireEvent.dragStart(tarjeta, { dataTransfer });
    fireEvent.dragOver(destino, { dataTransfer });
    fireEvent.drop(destino, { dataTransfer });

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(1, { estado: "en_progreso" }));
    expect(
      await screen.findByText(/"Escribir guion" movida a En progreso/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(1, { estado: "pendiente" }));
  });

  it("al pulsar una tarea se abre en grande con sus instrucciones", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    await userEvent.click(
      await screen.findByRole("button", { name: /Escribir guion/ }),
    );

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Título")).toHaveValue("Escribir guion");
    expect(within(dialogo).getByLabelText("Descripción")).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("Instrucciones")).toHaveValue("Ver notas.");
    expect(within(dialogo).getByLabelText("Estado")).toHaveValue("pendiente");
  });

  it("borrar una tarea pide confirmación en la página, sin window.confirm", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });
    const confirmSpy = vi.spyOn(window, "confirm");

    await renderMarketing();
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

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    // La foto se deduce del email contra las imágenes de public/.
    const avatares = await screen.findAllByLabelText(/Responsables:/);
    expect(avatares.length).toBeGreaterThan(0);
  });

  it("el calendario deja crear una tarea desde un día", async () => {
    await renderMarketing();
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

  it("la vista semana pide un rango de 7 días y pinta 7 celdas", async () => {
    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Calendario" }));
    await screen.findByRole("button", { name: /^Añadir tarea el 15 de/ });

    // Lectura cruzada entre departamentos por defecto (ver "Todos los
    // departamentos" en `CalendarPanel`): el rango de fechas se pide con
    // `getCalendarioEquipo`, no con el `getCalendario` de un solo departamento.
    getCalendarioEquipo.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Semana" }));

    await waitFor(() => expect(getCalendarioEquipo).toHaveBeenCalled());
    const [desde, hasta] = getCalendarioEquipo.mock.calls.at(-1) as [string, string];
    const dias = (new Date(hasta).getTime() - new Date(desde).getTime()) / 86_400_000;
    expect(dias).toBe(6);

    expect(document.querySelectorAll(".mkt-semana-dia-react").length).toBe(7);
    expect(document.querySelectorAll(".mkt-semana-columna-react").length).toBe(7);
  });

  it("lista los miembros del departamento con su carga", async () => {
    getMiembros.mockResolvedValue({
      ok: true,
      miembros: [
        { email: YO, equipos: ["marketing"], activo: true, tags: ["Copy"], abiertas: 0 },
        {
          email: "hugo@telecoemprende.es",
          equipos: ["marketing"],
          activo: true,
          tags: ["Reels"],
          abiertas: 5,
        },
      ],
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Miembros" }));

    expect(
      await screen.findByRole("heading", { name: "Miembros de Marketing" }),
    ).toBeInTheDocument();
    // El directorio enseña el nombre, no el email en crudo.
    expect(await screen.findByText("Abril")).toBeInTheDocument();
    expect(screen.getByText("Libre")).toBeInTheDocument();
    expect(screen.getByText("5 tareas abiertas")).toBeInTheDocument();
  });

  it("los más libres salen primero, para saber a quién asignar", async () => {
    getMiembros.mockResolvedValue({
      ok: true,
      miembros: [
        {
          email: "hugo@telecoemprende.es",
          equipos: ["marketing"],
          activo: true,
          tags: [],
          abiertas: 5,
        },
        { email: YO, equipos: ["marketing"], activo: true, tags: [], abiertas: 0 },
      ],
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Miembros" }));

    await screen.findByText("Abril");
    const nombres = screen
      .getAllByText(/^(Abril|Hugo)$/)
      .map((n) => n.textContent);
    expect(nombres).toEqual(["Abril", "Hugo"]);
  });

  it("filtra el directorio por habilidad", async () => {
    getMiembros.mockResolvedValue({
      ok: true,
      miembros: [
        { email: YO, equipos: ["marketing"], activo: true, tags: ["Copy"], abiertas: 0 },
        {
          email: "hugo@telecoemprende.es",
          equipos: ["marketing"],
          activo: true,
          tags: ["Reels"],
          abiertas: 1,
        },
      ],
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Miembros" }));
    await screen.findByText("Abril");

    await userEvent.click(screen.getByRole("button", { name: "Reels" }));

    expect(screen.getByText("Hugo")).toBeInTheDocument();
    expect(screen.queryByText("Abril")).not.toBeInTheDocument();
  });

  it("al tocar a alguien se abre su ficha con sus números", async () => {
    getMiembros.mockResolvedValue({
      ok: true,
      miembros: [
        { email: YO, equipos: ["marketing"], activo: true, tags: ["Copy"], abiertas: 2 },
      ],
    });
    getFichaMiembro.mockResolvedValue({
      ok: true,
      ficha: {
        email: YO,
        equipos: ["marketing"],
        vp_de: [],
        cargo: "",
        tags: ["Copy"],
        notas: "Mejor una cosa a la vez.",
        desde: "2026-01-15T10:00:00",
        abiertas: 2,
        completadas: 12,
        campanas: 3,
        mentor_email: "",
        actividad: [
          {
            id: 1,
            titulo: "Grabar reel de apertura",
            estado: "acabado" as TaskEstado,
            updated_at: new Date().toISOString(),
            padre: "Vuelta al cole",
          },
        ],
      },
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Miembros" }));
    await userEvent.click(await screen.findByText("Abril"));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("12")).toBeInTheDocument();
    expect(within(dialogo).getByText("Grabar reel de apertura", { exact: false }))
      .toBeInTheDocument();
    // La nota sale de solo lectura por defecto; el textarea para editarla
    // está detrás de "Editar perfil", no siempre a la vista.
    expect(within(dialogo).getByText("Mejor una cosa a la vez.", { exact: false }))
      .toBeInTheDocument();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Editar perfil" }));
    expect(within(dialogo).getByDisplayValue("Mejor una cosa a la vez."))
      .toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay proyectos", async () => {
    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Proyectos" }));

    expect(await screen.findByText(/Aún no hay campañas/)).toBeInTheDocument();
  });

  it("duplicar un proyecto lo recarga y abre la copia", async () => {
    getCampaigns.mockResolvedValue({
      ok: true,
      campaigns: [
        { id: 1, nombre: "Vuelta al cole", objetivo: "", total_contents: 2, total_tasks: 3, tareas_acabadas: 1, fecha: null },
      ],
    });
    duplicateCampaign.mockResolvedValue({
      ok: true,
      campaign: {
        id: 2,
        nombre: "Vuelta al cole (copia)",
        objetivo: "",
        audiencia: "",
        fecha: null,
        contents: [],
        tasks_sueltas: [],
      },
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Proyectos" }));
    await screen.findByText("Vuelta al cole");

    await userEvent.click(screen.getByRole("button", { name: "Duplicar" }));

    expect(duplicateCampaign).toHaveBeenCalledWith(1);
    expect(await screen.findByRole("heading", { name: "Vuelta al cole (copia)" })).toBeInTheDocument();
  });

  it("un enlace con ?campaign= abre esa campaña directamente en Proyectos", async () => {
    getCampaign.mockResolvedValue({
      ok: true,
      campaign: {
        id: 1, nombre: "Vuelta al cole", objetivo: "", audiencia: "", fecha: null,
        contents: [], tasks_sueltas: [],
      },
    });

    render(
      <MemoryRouter initialEntries={["/equipo?campaign=1"]}>
        <EquipoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Vuelta al cole" })).toBeInTheDocument();
    expect(getCampaign).toHaveBeenCalledWith(1);
    // La navegación ya marca "Proyectos" como la sección activa.
    const nav = screen.getByRole("navigation", { name: "Secciones de /equipo" });
    expect(within(nav).getByRole("button", { name: "Proyectos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("la navegación marca la pestaña activa", async () => {
    await renderMarketing();

    const nav = screen.getByRole("navigation", { name: "Secciones de /equipo" });
    expect(within(nav).getByRole("button", { name: "Mi semana" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // fireEvent y no userEvent: el TooltipTrigger de Radix se traga el primer
    // clic sintético en jsdom y el test fallaba de forma intermitente.
    fireEvent.click(within(nav).getByRole("button", { name: "Calendario" }));
    expect(within(nav).getByRole("button", { name: "Calendario" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("el calendario cuelga del club, no de un departamento", async () => {
    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Calendario" }));

    // Se pide con los departamentos de la persona, no con el de la ruta: el
    // calendario es uno solo para todo el club (ver `irA`).
    await waitFor(() => expect(getCalendarioEquipo).toHaveBeenCalled());
    expect(getCalendarioEquipo.mock.calls.at(-1)?.[2]).toEqual(
      expect.arrayContaining(teamsDeSesion),
    );
  });

  it("con más de un departamento, el calendario deja elegir a cuál va la tarea nueva", async () => {
    teamsDeSesion = ["marketing", "ingenieria"];
    vpDeSesion = ["marketing", "ingenieria"];

    render(
      <MemoryRouter>
        <EquipoPage />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Calendario" }));

    // Con un solo departamento no hay nada que elegir (ver el otro test de
    // creación de tarea); con más de uno, el selector aparece.
    const dia = await screen.findByRole("button", { name: /^Añadir tarea el 15 de/ });
    await userEvent.click(dia);
    await userEvent.selectOptions(
      screen.getByLabelText("Departamento de la tarea nueva"),
      "ingenieria",
    );

    const campo = await screen.findByLabelText(/Título de la tarea para el 15/);
    await userEvent.type(campo, "Preparar taller{Enter}");

    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: "Preparar taller" }),
      ),
    );
    // `apiDepto` se llamó con el departamento elegido en el selector, no con
    // el primero de la persona por defecto.
    expect(deptosPedidos.at(-1)).toBe("ingenieria");
  });

  it("un evento de otro departamento propio abre SU proyecto, no el de aquí", async () => {
    // Ingeniería no vale para este test: no tiene panel de Proyectos (ver
    // `PANELES_POR_EQUIPO`). Marketing y Eventos sí comparten el concepto (en
    // Eventos, la página lo titula "Eventos" en vez de "Proyectos").
    teamsDeSesion = ["marketing", "eventos"];
    vpDeSesion = ["marketing", "eventos"];
    getCalendarioEquipo.mockResolvedValue({
      ok: true,
      desde: "",
      hasta: "",
      items: [
        {
          origen: "task",
          id: 9,
          titulo: "Reservar la sala",
          fecha: enDias(2),
          estado: "pendiente",
          campaign_id: 5,
          detalle: "",
          prioridad: "media",
          padre: null,
          responsables: [],
          hora: null,
          departamento: "eventos",
        },
      ],
    });
    getCampaign.mockResolvedValue({
      ok: true,
      campaign: {
        id: 5, nombre: "Semana de bienvenida", objetivo: "", audiencia: "", fecha: null,
        contents: [], tasks_sueltas: [],
      },
    });

    await renderMarketing();
    await userEvent.click(screen.getByRole("button", { name: "Calendario" }));

    await userEvent.click(await screen.findByRole("button", { name: /Reservar la sala/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Ver campaña →" }));

    expect(
      await screen.findByRole("heading", { name: "Semana de bienvenida" }),
    ).toBeInTheDocument();
    expect(getCampaign).toHaveBeenCalledWith(5);
    // Y se pidió por la ruta de Eventos, que es de donde era el evento -- no
    // solo por la de Marketing, que es el panel desde el que se saltó.
    expect(deptosPedidos).toContain("eventos");
  });
});

describe("/equipo — panel de Eventos", () => {
  beforeEach(() => {
    teamsDeSesion = ["eventos"];
    vpDeSesion = ["eventos"];
    deptosPedidos.length = 0;
    getCampaigns.mockReset().mockResolvedValue({ ok: true, campaigns: [] });
    getCampaign.mockReset();
    getTasks.mockReset().mockResolvedValue({ ok: true, tasks: [], usuario: YO });
    getCalendario
      .mockReset()
      .mockResolvedValue({ ok: true, desde: "", hasta: "", items: [] });
    getMiembros.mockReset().mockResolvedValue({ ok: true, miembros: [] });
    getFichaMiembro.mockReset();
    getSalud
      .mockReset()
      .mockResolvedValue({
        ok: true,
        salud: { total: 0, sobrecargados: 0, inactivos: 0, pct_a_tiempo: null, miembros: [] },
      });
    listarRegistros.mockReset().mockImplementation((recurso: string) =>
      Promise.resolve({ ok: true, [recurso]: [] }),
    );
    updateFichaMiembro.mockReset().mockResolvedValue({ ok: true });
    duplicateCampaign.mockReset();
    updateTask.mockReset().mockResolvedValue({ ok: true });
    createTask.mockReset().mockResolvedValue({ ok: true, task: TAREA });
    getTaskComments.mockReset().mockResolvedValue({ ok: true, comments: [] });
    createTaskComment.mockReset();
    getCalendarioEquipo
      .mockReset()
      .mockResolvedValue({ ok: true, desde: "", hasta: "", items: [] });
  });

  async function renderEventos() {
    render(
      <MemoryRouter>
        <EquipoPage />
      </MemoryRouter>,
    );
    await screen.findByText(/tarea vence|tareas vencen|ninguna tarea vence/);
  }

  it("Eventos tiene su navegación completa, con las etiquetas genéricas del sidebar", async () => {
    await renderEventos();

    // El sidebar siempre usa el mismo rótulo, esté quien esté de Eventos o
    // de Marketing: nunca dice "Gestiones"/"Eventos" -- eso, si acaso, va en
    // el título de la página, nunca en el sidebar (ver EquipoSidebar.tsx).
    for (const panel of [
      "Mi semana", "Tareas", "Proyectos", "Calendario",
      "Recursos", "Presupuesto", "Reuniones", "Miembros", "Avisos",
    ]) {
      expect(screen.getByRole("button", { name: panel })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Gestiones" })).not.toBeInTheDocument();
  });

  it("los anuncios cuelgan del club, no de un departamento", async () => {
    await renderEventos();

    const anuncios = screen.getByRole("button", { name: "Avisos" });
    expect(anuncios).toBeInTheDocument();

    await userEvent.click(anuncios);

    // Se abre el panel de anuncios: el título lo pinta la barra del shell, así
    // que lo que identifica al panel es su propia frase y su acción.
    expect(
      await screen.findByText(/Comunicados para todo el club/),
    ).toBeInTheDocument();
    expect(listarRegistros).toHaveBeenCalledWith("anuncios");

    // El sidebar tiene UNA entrada de Avisos, no una por departamento: el
    // contenido es de todo el equipo aunque la ruta cuelgue de uno.
    const navegacion = screen.getByRole("navigation", { name: "Secciones de /equipo" });
    expect(within(navegacion).getAllByRole("button", { name: "Avisos" })).toHaveLength(1);
  });

  it("pide los datos al departamento de Eventos, no al de Marketing", async () => {
    await renderEventos();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    await waitFor(() => expect(getTasks).toHaveBeenCalled());
    expect([...new Set(deptosPedidos)]).toEqual(["eventos"]);
  });

  it("el tablero de gestiones de Eventos carga sus tareas", async () => {
    getTasks.mockResolvedValue({
      ok: true,
      usuario: YO,
      tasks: tareas({
        departamento: "eventos",
        titulo: "Reservar el espacio de la feria",
        // Tarea suelta de Eventos: no cuelga de ninguna campaña.
        campaign_id: null,
        content_id: null,
        content_titulo: null,
        campaign_nombre: null,
      }),
    });

    await renderEventos();
    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    expect(
      await screen.findByText("Reservar el espacio de la feria"),
    ).toBeInTheDocument();
  });

  it("quien solo es de Eventos no ve las secciones de Marketing", async () => {
    await renderEventos();

    expect(screen.queryByRole("button", { name: "Alumni" })).not.toBeInTheDocument();
    expect(deptosPedidos).not.toContain("marketing");
  });

  it("con más de un departamento, Proyectos junta los dos por defecto y el filtro deja acotar a uno", async () => {
    teamsDeSesion = ["marketing", "eventos"];
    vpDeSesion = ["marketing", "eventos"];
    getCampaigns.mockResolvedValue({ ok: true, campaigns: [] });

    render(
      <MemoryRouter>
        <EquipoPage />
      </MemoryRouter>,
    );
    await screen.findByText(/tarea vence|tareas vencen|ninguna tarea vence/);

    // Un solo "Proyectos" en el sidebar, no uno por departamento; el título
    // de la página es siempre el mismo rótulo genérico, nunca cambia con el
    // filtro (ver docs/CLAUDE.md).
    await userEvent.click(screen.getByRole("button", { name: "Proyectos" }));
    expect(screen.getByRole("heading", { level: 2, name: "Proyectos" })).toBeInTheDocument();

    // Por defecto se ven los dos departamentos a la vez -- no hace falta
    // elegir uno para entrar.
    await waitFor(() => expect(deptosPedidos).toEqual(expect.arrayContaining(["marketing", "eventos"])));

    const selector = screen.getByRole("group", { name: "Departamentos visibles" });
    const casillaEventos = within(selector).getByRole("checkbox", { name: "Eventos" });
    expect(casillaEventos).toBeChecked();

    // Se desmarca Eventos: el filtro se acota a solo Marketing, y el título
    // sigue diciendo "Proyectos" -- el sidebar y el título nunca cambian.
    deptosPedidos.length = 0;
    await userEvent.click(casillaEventos);

    expect(screen.getByRole("heading", { level: 2, name: "Proyectos" })).toBeInTheDocument();
    await waitFor(() => expect(new Set(deptosPedidos)).toEqual(new Set(["marketing"])));
  });
});
