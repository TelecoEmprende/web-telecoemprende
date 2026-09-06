import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// jsdom no implementa ResizeObserver; lo usan los componentes shadcn/Radix
// (Select, etc.) montados en /equipo y en el panel de accesos de /admin.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

HTMLCanvasElement.prototype.getContext = ((() => {
  return {
    clearRect: () => {},
    setTransform: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}) as unknown) as typeof HTMLCanvasElement.prototype.getContext;

// El timeout de findBy* es de Testing Library, NO el `testTimeout` de vitest:
// son dos relojes distintos. 1s se queda corto montando Radix en jsdom y
// provocaba fallos intermitentes que no eran fallos de código.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});

// jsdom no implementa matchMedia y los componentes de shadcn (use-mobile, del
// sidebar) lo usan para decidir si están en móvil. Stub mínimo: siempre
// escritorio.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
