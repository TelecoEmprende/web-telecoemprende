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

vi.mock("../../api/equipo", () => ({
  getEquipoSession: () =>
    Promise.resolve({
      ok: true,
      authenticated: true,
      teams: teamsDeSesion,
      vp_de: [],
      cargo: "",
      nombre: "",
    }),
  getEquipoCalendario: () => Promise.resolve({ ok: true, eventos: [] }),
  getCalendarioEquipo: (...args: unknown[]) => getCalendarioEquipo(...args),
  createEquipoCalendarioEvento: vi.fn(),
  getMisTareas: () => Promise.resolve({ ok: true, tareas: [] }),
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

/** Monta /equipo entero (el sidebar y la navegación son suyos, no del panel
 *  de Marketing) y entra en el resumen del departamento: la página abre en el
 *  inicio del club, que es lo común a todo el mundo. */
async function renderMarketing() {
  render(
    <MemoryRouter>
      <EquipoPage />
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByRole("button", { name: "Resumen" }));
}

describe("/equipo — panel de Marketing", () => {
  beforeEach(() => {
    teamsDeSesion = ["marketing"];
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

  it("abre en el resumen, no en el listado de miembros", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });

    await renderMarketing();

    // La pregunta con la que entra el usuario, no la estructura de los datos.
    expect(await screen.findByText(/cosa pendiente|cosas pendientes/)).toBeInTheDocument();
    // El resumen de campañas en marcha sí es parte de Home. Miembros (el
    // directorio de nombres reales, ver `DirectorioProvider`) se pide una vez
    // por departamento para toda la sesión, no solo al entrar al panel de
    // Miembros -- por eso sí se ha llamado, aunque no se vea la lista.
    expect(getCampaigns).toHaveBeenCalled();
    expect(getMiembros).toHaveBeenCalled();
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

    await renderMarketing();

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

    await renderMarketing();

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

    await renderMarketing();
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

    await renderMarketing();

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

    await renderMarketing();
    await screen.findByText(/cosa pendiente|cosas pendientes/);

    await userEvent.click(screen.getByRole("button", { name: "Tareas" }));

    // Las tarjetas son botones que abren la tarea en grande, estilo Trello.
    expect(await screen.findByRole("button", { name: /Escribir guion/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeInTheDocument();
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

  it("al pulsar una tarea se abre en grande con su contenido", async () => {
    getTasks.mockResolvedValue({ ok: true, tasks: tareas({}), usuario: YO });

    await renderMarketing();
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

    await renderMarketing();
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

    await renderMarketing();
    await screen.findByText(/cosa pendiente|cosas pendientes/);

    // La foto se deduce del email contra las imágenes de public/.
    const avatares = await screen.findAllByLabelText(/Responsables:/);
    expect(avatares.length).toBeGreaterThan(0);
  });

  it("el calendario deja crear una tarea desde un día", async () => {
    await renderMarketing();
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

  it("la vista semana pide un rango de 7 días y pinta 7 celdas", async () => {
    await renderMarketing();
    await screen.findByText(/Nada pendiente/);
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
    await screen.findByText(/Nada pendiente/);

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
    await screen.findByText(/Nada pendiente/);
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
    await screen.findByText(/Nada pendiente/);
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
    await screen.findByText(/Nada pendiente/);
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

  it("muestra el estado vacío cuando no hay campañas", async () => {
    await renderMarketing();
    await screen.findByText(/Nada pendiente/);

    await userEvent.click(screen.getByRole("button", { name: "Campañas" }));

    expect(await screen.findByText(/Aún no hay campañas/)).toBeInTheDocument();
  });

  it("duplicar una campaña la recarga y abre la copia", async () => {
    getCampaigns.mockResolvedValue({
      ok: true,
      campaigns: [
        { id: 1, nombre: "Vuelta al cole", objetivo: "", total_contents: 2, total_tasks: 3, fecha: null },
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
    await screen.findByText(/Nada pendiente/);
    await userEvent.click(screen.getByRole("button", { name: "Campañas" }));
    await screen.findByText("Vuelta al cole");

    await userEvent.click(screen.getByRole("button", { name: "Duplicar" }));

    expect(duplicateCampaign).toHaveBeenCalledWith(1);
    expect(await screen.findByRole("heading", { name: "Vuelta al cole (copia)" })).toBeInTheDocument();
  });

  it("un enlace con ?campaign= abre esa campaña directamente", async () => {
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
    await userEvent.click(await screen.findByRole("button", { name: "Resumen" }));

    expect(await screen.findByRole("heading", { name: "Vuelta al cole" })).toBeInTheDocument();
    expect(getCampaign).toHaveBeenCalledWith(1);
  });

  it("la navegación marca la pestaña activa", async () => {
    await renderMarketing();
    await screen.findByText(/Nada pendiente/);

    const nav = screen.getByRole("navigation", { name: "Secciones de /equipo" });
    expect(within(nav).getByRole("button", { name: "Resumen" })).toHaveAttribute(
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

    // Misma comprobación que ya existe para Anuncios: la barra rotula "Club",
    // no "Marketing", aunque la ruta cuelgue del primer departamento de la
    // persona (ver `clubDe` en EquipoSidebar).
    expect(document.querySelector(".workspace-barra-depto-react")?.textContent).toBe("Club");
  });

  it("con más de un departamento, el calendario deja elegir a cuál va la tarea nueva", async () => {
    teamsDeSesion = ["marketing", "ingenieria"];

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

  it("un evento de otro departamento propio abre SU campaña, no la de aquí", async () => {
    // Ingeniería no vale para este test: no tiene panel de Campañas (ver
    // `PANELES_POR_EQUIPO`). Marketing y Eventos sí comparten el concepto
    // (en Eventos se llama "Eventos" en vez de "Campañas").
    teamsDeSesion = ["marketing", "eventos"];
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

    render(
      <MemoryRouter>
        <EquipoPage />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Resumen" }));
    await userEvent.click(screen.getByRole("button", { name: "Calendario" }));

    await userEvent.click(await screen.findByRole("button", { name: /Reservar la sala/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Ver campaña →" }));

    expect(
      await screen.findByRole("heading", { name: "Semana de bienvenida" }),
    ).toBeInTheDocument();
    expect(getCampaign).toHaveBeenCalledWith(5);
    // Se remontó el dashboard en el contexto de Eventos: la barra ya no dice
    // "Club" sino el departamento al que se saltó.
    expect(document.querySelector(".workspace-barra-depto-react")?.textContent).toBe("Eventos");
  });
});

describe("/equipo — panel de Eventos", () => {
  beforeEach(() => {
    teamsDeSesion = ["eventos"];
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
    await userEvent.click(await screen.findByRole("button", { name: "Resumen" }));
  }

  it("Eventos tiene su navegación completa, con los nombres de Eventos", async () => {
    await renderEventos();

    for (const panel of [
      "Resumen", "Eventos", "Gestiones", "Calendario",
      "Recursos", "Presupuesto", "Reuniones", "Miembros",
    ]) {
      expect(screen.getByRole("button", { name: panel })).toBeInTheDocument();
    }
    // En Eventos las tareas se llaman gestiones y las campañas, eventos.
    expect(screen.queryByRole("button", { name: "Tareas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Campañas" })).not.toBeInTheDocument();
  });

  it("los anuncios cuelgan del club, no de un departamento", async () => {
    await renderEventos();

    const anuncios = screen.getByRole("button", { name: "Anuncios" });
    expect(anuncios).toBeInTheDocument();

    await userEvent.click(anuncios);

    // Se abre el panel de anuncios (el h3 es el del panel; el h2 es el título
    // que pinta la barra del shell).
    expect(
      await screen.findByRole("heading", { name: "Anuncios", level: 3 }),
    ).toBeInTheDocument();
    expect(listarRegistros).toHaveBeenCalledWith("anuncios");

    // Y la barra lo rotula como Club, no como Eventos: el contenido es de todo
    // el equipo aunque la ruta cuelgue de un departamento.
    expect(document.querySelector(".workspace-barra-depto-react")?.textContent).toBe("Club");
  });

  it("pide los datos al departamento de Eventos, no al de Marketing", async () => {
    await renderEventos();

    await waitFor(() => expect(getTasks).toHaveBeenCalled());
    expect([...new Set(deptosPedidos)]).toEqual(["eventos"]);
  });

  it("el tablero de tareas de Eventos carga sus tareas", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: "Gestiones" }));

    expect(
      await screen.findByText("Reservar el espacio de la feria"),
    ).toBeInTheDocument();
  });

  it("quien solo es de Eventos no ve las secciones de Marketing", async () => {
    await renderEventos();

    expect(screen.queryByRole("button", { name: "Campañas" })).not.toBeInTheDocument();
    expect(deptosPedidos).not.toContain("marketing");
  });

  it("con más de un departamento, solo el primero empieza desplegado", async () => {
    teamsDeSesion = ["marketing", "eventos"];

    render(
      <MemoryRouter>
        <EquipoPage />
      </MemoryRouter>,
    );

    // Marketing es el primero: su "Resumen" ya se ve sin tocar nada.
    await screen.findByRole("button", { name: "Resumen" });
    // Eventos empieza plegado: "Gestiones" (su Tareas) no está a la vista.
    expect(screen.queryByRole("button", { name: "Gestiones" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Sección Eventos/ }));

    expect(await screen.findByRole("button", { name: "Gestiones" })).toBeInTheDocument();
  });
});
