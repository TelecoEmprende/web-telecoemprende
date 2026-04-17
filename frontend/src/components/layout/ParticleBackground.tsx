import { useEffect, useRef } from "react";

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const spacingForWidth = (viewportWidth: number) => {
      if (viewportWidth <= 420) return 14;
      if (viewportWidth <= 720) return 16;
      if (viewportWidth <= 1024) return 18;
      return 20;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      const t = time * 0.00078;
      const spacing = spacingForWidth(width);
      const columns = Math.ceil(width / spacing) + 3;
      const rows = Math.ceil(height / spacing) + 4;

      context.clearRect(0, 0, width, height);

      const points: Array<Array<{ x: number; y: number }>> = [];

      for (let row = 0; row < rows; row += 1) {
        const rowPoints: Array<{ x: number; y: number }> = [];
        const baseY = row * spacing - spacing;
        const rowPhase = row * 0.52;
        const rowOffsetX = (row % 2) * spacing * 0.45;

        for (let column = 0; column < columns; column += 1) {
          const baseX = column * spacing - spacing + rowOffsetX;
          const waveY =
            Math.sin(column * 0.52 + t + rowPhase) * spacing * 0.34 +
            Math.cos(row * 0.34 + t * 1.55) * spacing * 0.18;
          const waveX =
            Math.sin(row * 0.4 + t * 1.12 + column * 0.12) * spacing * 0.2 +
            Math.cos(column * 0.16 + t * 0.85) * spacing * 0.06;

          rowPoints.push({
            x: baseX + waveX,
            y: baseY + waveY,
          });
        }

        points.push(rowPoints);
      }

      for (let row = 0; row < points.length; row += 1) {
        for (let column = 0; column < points[row].length; column += 1) {
          const point = points[row][column];
          const shimmer =
            0.38 + ((Math.sin(t * 1.8 + row * 0.5 + column * 0.28) + 1) / 2) * 0.32;

          context.beginPath();
          context.fillStyle = `rgba(82, 155, 255, ${0.18 * shimmer})`;
          context.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
          context.fill();

          context.beginPath();
          context.fillStyle = `rgba(149, 204, 255, ${0.58 * shimmer})`;
          context.arc(point.x, point.y, 0.92, 0, Math.PI * 2);
          context.fill();
        }
      }

      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    frameId = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="particle-background-shell" aria-hidden="true">
      <div className="particle-background-glow particle-background-glow-left" />
      <div className="particle-background-glow particle-background-glow-right" />
      <canvas ref={canvasRef} className="particle-background-canvas" />
    </div>
  );
}
