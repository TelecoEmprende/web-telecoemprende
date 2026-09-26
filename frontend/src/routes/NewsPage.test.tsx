import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { NewsPage } from "./NewsPage";
import { LanguageProvider } from "../i18n/LanguageContext";
import { agruparPorDia, relativo, type Noticia } from "../api/news";

const HOY = new Date().toISOString().slice(0, 10);
const HACE_2 = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);

const noticia = (id: number, fecha: string, tema: Noticia["tema"], relevancia: number | null): Noticia => ({
  id,
  fecha,
  tema,
  relevancia,
  fuentes_count: 1,
  titular: `Titular ${id}`,
  que_paso: `Pasó ${id}`,
  por_que_importa: `Importa ${id}`,
  fuentes: [{ medio: "Medio", titulo: `Fuente ${id}`, url: `https://ejemplo.test/${id}` }],
});

const SEMANA = [
  noticia(1, HOY, "ia", 60),
  noticia(2, HOY, "inversion", 90),
  noticia(3, HACE_2, "startups", 70),
  noticia(4, HACE_2, "inversion", null),
];

function montar(respuesta: () => Promise<Response>, ruta = "/news") {
  vi.stubGlobal("fetch", vi.fn(respuesta));
  Element.prototype.scrollIntoView = vi.fn();
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <NewsPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

const ok = (noticias: Noticia[]) => () => Promise.resolve(new Response(JSON.stringify({ noticias })));

afterEach(() => vi.unstubAllGlobals());

describe("agruparPorDia", () => {
  it("ordena los días del más reciente al más antiguo y cada día por relevancia (NULL al final)", () => {
    const dias = agruparPorDia(SEMANA);
    expect(dias.map((d) => d.fecha)).toEqual([HOY, HACE_2]);
    expect(dias[0].noticias.map((n) => n.id)).toEqual([2, 1]);
    expect(dias[1].noticias.map((n) => n.id)).toEqual([3, 4]);
  });

  it("filtra por tema y descarta los días que se quedan vacíos", () => {
    expect(agruparPorDia(SEMANA, "startups").map((d) => d.fecha)).toEqual([HACE_2]);
  });
});

describe("relativo", () => {
  it("marca hoy y ayer y nada más", () => {
    const hoy = new Date("2026-09-25T09:00:00Z");
    expect(relativo("2026-09-25", hoy)).toBe("hoy");
    expect(relativo("2026-09-24", hoy)).toBe("ayer");
    expect(relativo("2026-09-23", hoy)).toBeNull();
  });
});

describe("NewsPage", () => {
  it("abre hoy con su noticia más relevante desplegada y deja plegados los días anteriores", async () => {
    montar(ok(SEMANA));
    const principal = await screen.findByRole("button", { name: /titular 2/i });
    expect(screen.getByRole("heading", { level: 1, name: /noticias para emprender: hoy/i })).toBeInTheDocument();

    expect(principal).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /fuente 2/i })).toHaveAttribute("href", "https://ejemplo.test/2");
    expect(screen.getByRole("button", { name: /titular 1/i })).toHaveAttribute("aria-expanded", "false");

    const diaAnterior = screen.getByRole("button", { name: /titular 3.*2 noticias/i });
    expect(diaAnterior).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(diaAnterior);
    expect(diaAnterior).toHaveAttribute("aria-expanded", "true");
  });

  it("/news#noticia-<id> abre el día y la fila de esa noticia y baja hasta ella", async () => {
    montar(ok(SEMANA), "/news#noticia-4");
    const fila = await screen.findByRole("button", { name: /titular 4/i });
    expect(fila).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /titular 3.*2 noticias/i })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it("el filtro de tema deja solo ese tema", async () => {
    montar(ok(SEMANA));
    await screen.findByRole("button", { name: /titular 2/i });
    await userEvent.click(screen.getByRole("button", { name: "Startups" }));
    expect(screen.queryByText("Titular 2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /titular 3/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("sin noticias de un tema lo dice en vez de dejar la página vacía", async () => {
    montar(ok(SEMANA));
    await screen.findByRole("button", { name: /titular 2/i });
    await userEvent.click(screen.getByRole("button", { name: "Tech" }));
    expect(screen.getByText("Esta semana no hay noticias de Tech.")).toBeInTheDocument();
  });

  it("si la API falla ofrece reintentar y recupera", async () => {
    let llamadas = 0;
    montar(() => (++llamadas === 1 ? Promise.resolve(new Response("", { status: 500 })) : ok(SEMANA)()));
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("No hemos podido cargar las noticias.");
    await userEvent.click(within(alerta).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: /titular 2/i })).toBeInTheDocument();
  });
});
