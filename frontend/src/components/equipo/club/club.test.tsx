import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pendientesDelActa } from "../registros/ReunionesPanel";
import { AmbitoChips, etiquetaAmbito } from "./AmbitoChips";
import { describirEvento, formatearValor } from "./HistorialLista";
import { MesaPanel } from "./MesaPanel";
import { PapeleraPanel } from "./PapeleraPanel";
import type { EventoHistorial } from "../../../types/club";

const getMesa = vi.fn();
const getPapelera = vi.fn();
const restaurar = vi.fn();
const borrarParaSiempre = vi.fn();
const updateTask = vi.fn();

vi.mock("../../../api/club", () => ({
  getMesa: (...a: unknown[]) => getMesa(...a),
  getPapelera: (...a: unknown[]) => getPapelera(...a),
  restaurar: (...a: unknown[]) => restaurar(...a),
  borrarParaSiempre: (...a: unknown[]) => borrarParaSiempre(...a),
  getHistorial: () => Promise.resolve({ ok: true, eventos: [] }),
}));
vi.mock("../../../api/marketing", () => ({
  apiDepto: () => ({ updateTask: (...a: unknown[]) => updateTask(...a) }),
}));
vi.mock("../DeptoApi", () => ({ useFotos: () => ({}), useDirectorio: () => ({}) }));

const evento = (parcial: Partial<EventoHistorial>): EventoHistorial => ({
  id: 1, entidad: "proyecto", entidad_id: 1, proyecto_id: 1, accion: "editar", titulo: "Feria",
  cambios: [], creado_en: new Date().toISOString(), persona: "ana@example.com", persona_nombre: "Ana",
  ...parcial,
});

describe("historial", () => {
  it("cuenta quién hizo qué con el antes y el después", () => {
    const d = describirEvento(
      evento({ cambios: [{ campo: "estado", antes: "activo", despues: "pausado" }] }),
    );
    expect(d.quien).toBe("Ana");
    expect(d.frase).toBe("cambió el estado de el proyecto «Feria»");
    expect(formatearValor("estado", "pausado")).toBe("En pausa");
    expect(formatearValor("responsables", [])).toBe("nadie");
    expect(formatearValor("departamentos", ["marketing", "eventos"])).toBe("Marketing, Eventos");
  });

  it("borrar y restaurar tienen su propia frase, y un editor sin cuenta es «Alguien»", () => {
    expect(describirEvento(evento({ accion: "borrar", persona: "" })).frase).toBe(
      "envió a la papelera el proyecto «Feria»",
    );
    expect(describirEvento(evento({ accion: "borrar", persona: "" })).quien).toBe("Alguien");
    expect(describirEvento(evento({ accion: "restaurar", entidad: "tarea", titulo: "Cartel" })).frase).toBe(
      "restauró la tarea «Cartel»",
    );
  });

  it("varios cambios en una edición se listan debajo", () => {
    const d = describirEvento(
      evento({
        cambios: [
          { campo: "nombre", antes: "A", despues: "B" },
          { campo: "estado", antes: "idea", despues: "activo" },
        ],
      }),
    );
    expect(d.frase).toBe("editó el proyecto «Feria»");
    expect(d.detalle).toHaveLength(2);
  });
});

describe("AmbitoChips", () => {
  it("«Todo el club» marca los tres, y el último departamento no se puede quitar", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<AmbitoChips value={["marketing"]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Todo el club" }));
    expect(onChange).toHaveBeenLastCalledWith(["marketing", "eventos", "ingenieria"]);

    await userEvent.click(screen.getByRole("button", { name: "Eventos" }));
    expect(onChange).toHaveBeenLastCalledWith(["marketing", "eventos"]);

    // Con uno solo, tocarlo no lo deja vacío.
    onChange.mockClear();
    rerender(<AmbitoChips value={["marketing"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Marketing" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("nombra el ámbito: los tres son todo el club", () => {
    expect(etiquetaAmbito(["marketing", "eventos", "ingenieria"])).toEqual(["Todo el club"]);
    expect(etiquetaAmbito(["ingenieria", "marketing"])).toEqual(["Marketing", "Ingeniería"]);
  });
});

describe("pendientes del acta", () => {
  it("cuenta las casillas sin marcar, también dentro de otras", () => {
    const acta = [
      { type: "checkListItem", props: { checked: false } },
      { type: "checkListItem", props: { checked: true } },
      { type: "bulletListItem", children: [{ type: "checkListItem", props: { checked: false } }] },
      { type: "paragraph" },
    ];
    expect(pendientesDelActa(acta)).toBe(2);
    expect(pendientesDelActa(null)).toBe(0);
  });
});

describe("PapeleraPanel", () => {
  beforeEach(() => {
    getPapelera.mockReset().mockResolvedValue({
      ok: true,
      dias: 30,
      elementos: [
        {
          entidad: "tarea", id: 7, titulo: "Cartel", padre: "Feria",
          borrado_en: new Date().toISOString(), borrado_por: "ana@example.com", borrado_por_nombre: "Ana",
        },
      ],
    });
    restaurar.mockReset().mockResolvedValue({ ok: true });
    borrarParaSiempre.mockReset().mockResolvedValue({ ok: true });
  });

  it("lista lo borrado y lo restaura", async () => {
    render(<PapeleraPanel esAdmin={false} />);
    expect(await screen.findByText("Cartel")).toBeInTheDocument();
    expect(screen.getByText(/De «Feria»/)).toBeInTheDocument();
    // Solo un admin borra para siempre.
    expect(screen.queryByRole("button", { name: "Borrar para siempre" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(restaurar).toHaveBeenCalledWith("tarea", 7);
  });

  it("el admin ve el borrado definitivo", async () => {
    render(<PapeleraPanel esAdmin />);
    await userEvent.click(await screen.findByRole("button", { name: "Borrar para siempre" }));
    expect(borrarParaSiempre).toHaveBeenCalledWith("tarea", 7);
  });
});

describe("MesaPanel", () => {
  beforeEach(() => {
    updateTask.mockReset().mockResolvedValue({ ok: true });
    getMesa.mockReset().mockResolvedValue({
      ok: true,
      actividad: [],
      mesa: {
        dias_estancado: 14,
        sin_responsable: 1,
        estancados: 1,
        proyectos: [
          {
            id: 1, nombre: "Feria de empleo", estado: "activo", departamentos: ["marketing", "eventos", "ingenieria"],
            responsable: "", fecha: null, total_tasks: 4, tareas_acabadas: 1,
            ultima_actividad: null, dias_sin_movimiento: 20, estancado: true,
            siguiente_titulo: "Imprimir carteles", siguiente_deadline: null, siguiente_responsables: [],
            entregables: [
              { id: 3, titulo: "Carteles", fecha: null, total: 2, acabadas: 1 },
              { id: 4, titulo: "Stand", fecha: "2020-01-10", total: 1, acabadas: 0 },
            ],
          },
        ],
        sin_dueno: [
          { id: 9, titulo: "Reservar sala", departamento: "eventos", deadline: null, padre: null },
        ],
        atrasadas: [],
        personas: [
          {
            email: "ana@example.com",
            atrasadas: 1,
            tareas: [{ id: 7, titulo: "Llamar al ponente", departamento: "eventos", deadline: "2020-01-01", padre: null }],
          },
          { email: "bea@example.com", atrasadas: 0, tareas: [] },
        ],
      },
    });
  });

  it("pone sobre la mesa los proyectos, lo sin dueño y lo estancado", async () => {
    render(<MesaPanel email="yo@example.com" nombre="Yo" onAbrirProyecto={vi.fn()} />);

    expect(await screen.findByText("Feria de empleo")).toBeInTheDocument();
    expect(screen.getByText("Todo el club")).toBeInTheDocument();
    expect(screen.getByText("Sin responsable", { selector: ".is-vacio" })).toBeInTheDocument();
    expect(screen.getByText("Sin moverse 20 días")).toBeInTheDocument();
    expect(screen.getByText("Carteles · 1/2")).toBeInTheDocument();
    expect(screen.getByText(/Fases \(2 · 1 vencida\)/)).toBeInTheDocument();
    expect(screen.getByText(/Stand · venció el/)).toHaveClass("is-vencida");
    expect(screen.getByText(/1 abierta/)).toBeInTheDocument();
    expect(screen.getByText(/1 atrasada/)).toBeInTheDocument();
    expect(screen.getByText("Libre")).toBeInTheDocument();
    expect(screen.getByText(/Imprimir carteles/)).toBeInTheDocument();
    expect(screen.getByText("Nada atrasado. Así da gusto.")).toBeInTheDocument();
  });

  it("«Me la quedo» asigna la tarea sin dueño a quien mira, en su departamento", async () => {
    render(<MesaPanel email="yo@example.com" nombre="Yo" onAbrirProyecto={vi.fn()} />);

    const fila = (await screen.findByText("Reservar sala")).closest("li") as HTMLElement;
    await userEvent.click(within(fila).getByRole("button", { name: "Me la quedo" }));

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(9, { responsables: ["yo@example.com"] }));
    expect(getMesa).toHaveBeenCalledTimes(2);
  });

  it("abrir un proyecto lo pide por su primer departamento", async () => {
    const onAbrir = vi.fn();
    render(<MesaPanel email="yo@example.com" nombre="Yo" onAbrirProyecto={onAbrir} />);
    await userEvent.click(await screen.findByRole("button", { name: "Feria de empleo" }));
    expect(onAbrir).toHaveBeenCalledWith(1, "marketing");
  });
});
