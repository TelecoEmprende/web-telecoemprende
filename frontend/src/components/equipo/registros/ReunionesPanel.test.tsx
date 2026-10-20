import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReunionesPanel, acuerdosPendientes, marcarComoTarea } from "./ReunionesPanel";

const listarRegistros = vi.fn();
const crearRegistro = vi.fn();
const createTask = vi.fn();
const actualizarRegistro = vi.fn();

const deptosUsados: string[] = [];

vi.mock("../../../api/marketing", () => ({
  apiDepto: (depto: string) => ({
    listarRegistros: (...args: unknown[]) => listarRegistros(...args),
    crearRegistro: (...args: unknown[]) => crearRegistro(...args),
    actualizarRegistro: (...args: unknown[]) => {
      deptosUsados.push(depto);
      return actualizarRegistro(...args);
    },
    createTask: (...args: unknown[]) => createTask(...args),
    getMiembros: vi.fn().mockResolvedValue({ ok: true, miembros: [] }),
  }),
}));
// El editor de verdad (BlockNote) no hace falta para esto.
vi.mock("../notas/NotaEditor", () => ({ default: () => <div>acta</div> }));

const JUNTA = {
  id: 5, titulo: "Junta", fecha: "", hora: "", objetivo: "", asistentes: [], contenido: [],
  departamento: "directiva", solo_directiva: false, creado_por: "", created_at: "", updated_at: "",
};

describe("ReunionesPanel · directiva", () => {
  beforeEach(() => {
    listarRegistros.mockReset().mockResolvedValue({ ok: true, reuniones: [] });
    actualizarRegistro.mockReset().mockResolvedValue({ ok: true });
    crearRegistro.mockReset().mockResolvedValue({ ok: true, registro: { ...JUNTA, solo_directiva: true } });
  });

  it("sin cargo no se ofrece convocar una de directiva", async () => {
    render(<ReunionesPanel deptos={["marketing"]} esDirectiva={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "+ Nueva reunión" }));
    expect(screen.queryByRole("option", { name: "Directiva" })).not.toBeInTheDocument();
  });

  it("la directiva la convoca y por defecto solo la ve ella", async () => {
    render(<ReunionesPanel deptos={["marketing"]} esDirectiva />);
    await userEvent.click(await screen.findByRole("button", { name: "+ Nueva reunión" }));
    await userEvent.type(screen.getByLabelText("Título"), "Junta");
    await userEvent.selectOptions(screen.getByLabelText("De quién es"), "directiva");
    expect(screen.getByRole("checkbox", { name: "Solo la ve la directiva" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Crear reunión" }));

    expect(crearRegistro).toHaveBeenCalledWith(
      "reuniones",
      expect.objectContaining({ directiva: true, solo_directiva: true }),
    );
  });

  it("una de directiva abierta al club la lee quien no es de la directiva, sin poder tocarla", async () => {
    listarRegistros.mockResolvedValue({ ok: true, reuniones: [JUNTA] });
    render(<ReunionesPanel deptos={["marketing"]} esDirectiva={false} />);
    await userEvent.click(await screen.findByRole("button", { name: /Junta/ }));

    expect(screen.getByLabelText("Título")).toBeDisabled();
    expect(screen.getByText("Solo lectura: la edita la directiva")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar reunión a la papelera" })).not.toBeInTheDocument();
  });
});

const ACTA = [
  { id: "a", type: "heading", content: "Tareas" },
  { id: "b", type: "checkListItem", props: { checked: false }, content: [{ type: "text", text: "Reservar sala", styles: {} }] },
  { id: "c", type: "checkListItem", props: { checked: true }, content: "Ya hecha" },
  { id: "d", type: "checkListItem", props: { checked: false }, content: "" },
  {
    id: "e", type: "bulletListItem", content: "Dentro:",
    children: [{ id: "f", type: "checkListItem", props: { checked: false }, content: "Llamar al ponente" }],
  },
];

describe("acuerdos del acta", () => {
  it("salen las casillas sin marcar con texto, también las anidadas", () => {
    expect(acuerdosPendientes(ACTA)).toEqual([
      { id: "b", texto: "Reservar sala" },
      { id: "f", texto: "Llamar al ponente" },
    ]);
    expect(acuerdosPendientes(null)).toEqual([]);
  });

  it("pasar uno a tarea lo marca y lo deja escrito, sin tocar el resto", () => {
    const nuevo = marcarComoTarea(ACTA, "f");
    expect(acuerdosPendientes(nuevo)).toEqual([{ id: "b", texto: "Reservar sala" }]);
    type Casilla = { props: { checked: boolean }; content: { text: string }[] };
    const f = (nuevo as { children?: Casilla[] }[])[4].children![0];
    expect(f.props.checked).toBe(true);
    expect(f.content.map((t) => t.text).join("")).toBe("Llamar al ponente → tarea creada");
  });

  it("desde la reunión, un acuerdo se convierte en tarea y el acta se guarda marcada", async () => {
    listarRegistros.mockResolvedValue({
      ok: true,
      reuniones: [{ ...JUNTA, departamento: "eventos", titulo: "Semanal", contenido: ACTA }],
    });
    createTask.mockReset().mockResolvedValue({ ok: true, task: { id: 9 } });
    actualizarRegistro.mockReset().mockResolvedValue({ ok: true });
    render(<ReunionesPanel deptos={["marketing"]} esDirectiva={false} />);
    await userEvent.click(await screen.findByRole("button", { name: /Semanal/ }));
    expect(listarRegistros).toHaveBeenCalledWith("reuniones", ["marketing"]);

    const botones = screen.getAllByRole("button", { name: "Pasar a tarea" });
    expect(botones).toHaveLength(2);
    await userEvent.click(botones[0]);
    // Antes de crearla se puede cambiar todo: título, instrucciones, tablero...
    const titulo = screen.getByLabelText("Tarea");
    expect(titulo).toHaveValue("Reservar sala");
    await userEvent.clear(titulo);
    await userEvent.type(titulo, "Reservar sala B");
    expect(screen.getByLabelText("En qué tablero sale")).toHaveValue("eventos");
    await userEvent.click(screen.getByRole("button", { name: "Crear tarea" }));

    expect(createTask).toHaveBeenCalledWith({
      titulo: "Reservar sala B",
      instrucciones: "Acuerdo de la reunión «Semanal».",
      responsables: [],
      deadline: null,
    });
    expect(await screen.findByText(/«Reservar sala» ya es una tarea/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pasar a tarea" })).toHaveLength(1);
    await waitFor(() =>
      expect(actualizarRegistro).toHaveBeenCalledWith(
        "reuniones",
        5,
        expect.objectContaining({ contenido: marcarComoTarea(ACTA, "b") }),
      ),
    );
  });
});

describe("editar una reunión ya creada", () => {
  it("se guarda por la ruta de su departamento, no por la del primero visible", async () => {
    deptosUsados.length = 0;
    listarRegistros.mockReset().mockResolvedValue({
      ok: true,
      reuniones: [{ ...JUNTA, departamento: "eventos", titulo: "Plano de la feria" }],
    });
    actualizarRegistro.mockReset().mockResolvedValue({ ok: true });
    render(<ReunionesPanel deptos={["ingenieria", "marketing", "eventos"]} esDirectiva={false} />);
    await userEvent.click(await screen.findByRole("button", { name: /Plano de la feria/ }));

    const titulo = screen.getByLabelText("Título");
    expect(titulo).toBeEnabled();
    await userEvent.type(titulo, " v2");

    await waitFor(() => expect(actualizarRegistro).toHaveBeenCalled());
    expect(new Set(deptosUsados)).toEqual(new Set(["eventos"]));
  });
});
