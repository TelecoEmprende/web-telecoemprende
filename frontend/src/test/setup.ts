import { cleanup } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
});
