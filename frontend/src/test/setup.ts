import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

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
