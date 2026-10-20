import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotasPanel } from "./NotasPanel";

const actualizarNota = vi.fn();
const NOTA = {
  id: 1, titulo: "Acta", contenido: [], departamento: "", privada: false, fijada: false,
  creado_por: "yo@upm.es", editado_por: "", created_at: "", updated_at: "", proyecto_id: null,
};

vi.mock("../../../api/notas", () => ({
  listarNotas: () => Promise.resolve({ ok: true, notas: [] }),
  obtenerNota: () => Promise.resolve({ ok: true, nota: NOTA }),
  crearNota: vi.fn(),
  eliminarNota: vi.fn(),
  actualizarNota: (...args: unknown[]) => actualizarNota(...args),
}));
vi.mock("../../../api/club", () => ({ restaurar: vi.fn() }));
vi.mock("./NotaEditor", () => ({ default: () => <div>editor</div> }));

describe("Notas · si guardar falla", () => {
  afterEach(() => vi.useRealTimers());

  it("lo escrito no se pierde: avisa y lo vuelve a mandar entero", async () => {
    render(<NotasPanel email="yo@upm.es" teams={["marketing"]} notaInicial={1} onNotaAbierta={() => {}} />);
    const titulo = await screen.findByLabelText("Título de la nota");

    vi.useFakeTimers();
    actualizarNota
      .mockRejectedValueOnce({ ok: false, message: "Sin conexión con el servidor.", reintentable: true })
      .mockResolvedValue({ ok: true });
    fireEvent.change(titulo, { target: { value: "Acta del lunes" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText(/Lo escrito sigue aquí y se volverá a intentar solo/)).toBeInTheDocument();
    expect(titulo).toHaveValue("Acta del lunes");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(actualizarNota).toHaveBeenCalledTimes(2);
    expect(actualizarNota).toHaveBeenLastCalledWith(1, { titulo: "Acta del lunes" });
    expect(screen.queryByText(/Lo escrito sigue aquí/)).not.toBeInTheDocument();
  });
});
