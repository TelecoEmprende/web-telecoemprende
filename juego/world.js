// Mapa del "overworld" del juego (estilo Pokémon): representa de forma
// estilizada el campus de la ETSIT-UPM. Aquí solo viven los datos del mapa
// (tiles + colisión + textura); el jugador, los NPCs y el bucle de juego
// están en game.js.

export const TILE_SIZE = 32;
export const MAP_COLS = 20;
export const MAP_ROWS = 14;

// Tiles no transitables. Todo lo que no esté aquí se puede pisar.
const SOLIDOS = new Set(["scrub", "edificioC", "hall", "biblioteca", "secretaria", "arbol"]);

function rect(mapa, c0, r0, c1, r1, tipo) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      mapa[r][c] = tipo;
    }
  }
}

function construirMapa() {
  const mapa = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill("grass"));

  // Borde del mapa: tierra/scrub no transitable.
  rect(mapa, 0, 0, MAP_COLS - 1, 0, "scrub");
  rect(mapa, 0, MAP_ROWS - 1, MAP_COLS - 1, MAP_ROWS - 1, "scrub");
  rect(mapa, 0, 0, 0, MAP_ROWS - 1, "scrub");
  rect(mapa, MAP_COLS - 1, 0, MAP_COLS - 1, MAP_ROWS - 1, "scrub");

  rect(mapa, 1, 1, 4, 5, "edificioC"); // Edificio C
  rect(mapa, 8, 1, 15, 2, "hall"); // Hall / nave larga
  rect(mapa, 9, 4, 14, 8, "biblioteca"); // CEMDATIC + Biblioteca ETSIT
  rect(mapa, 9, 8, 14, 9, "secretaria"); // Secretaría de Alumnos (pisa la fila 8)
  rect(mapa, 1, 9, 3, 11, "sports"); // Sports Field, transitable
  rect(mapa, 5, 6, 17, 7, "plaza"); // Plaza/paso central: corta la biblioteca en sus filas 6-7

  mapa[3][6] = "arbol";
  mapa[3][16] = "arbol";

  return mapa;
}

export const MAPA = construirMapa();

export function esSolido(col, row) {
  if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return true;
  return SOLIDOS.has(MAPA[row][col]);
}

const COLOR_TILE = {
  scrub: "#8a6f4d",
  grass: "#2f6b3d",
  edificioC: "#c9b48c",
  hall: "#b8a683",
  biblioteca: "#c2ad82",
  secretaria: "#ab9877",
  sports: "#3f7d3a",
  plaza: "#d8c9a3",
  arbol: "#1f4d2b",
};

const EDIFICIOS = new Set(["edificioC", "hall", "biblioteca", "secretaria"]);

function dibujarDetalleTile(ctx, tipo, x, y) {
  const s = TILE_SIZE;
  if (EDIFICIOS.has(tipo)) {
    // rejilla de ventanas pequeñas oscuras sobre el hormigón
    ctx.fillStyle = "rgba(17, 37, 50, 0.55)";
    ctx.fillRect(x + s * 0.18, y + s * 0.22, s * 0.22, s * 0.22);
    ctx.fillRect(x + s * 0.6, y + s * 0.22, s * 0.22, s * 0.22);
  } else if (tipo === "sports") {
    // sugerencia de pista de atletismo (óvalo terracota)
    ctx.strokeStyle = "rgba(184, 91, 42, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s / 2, s * 0.36, s * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tipo === "arbol") {
    ctx.fillStyle = "#0f3319";
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s * 0.4, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(x + s / 2 - 2, y + s * 0.6, 4, s * 0.35);
  } else if (tipo === "grass") {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x + s * 0.3, y + s * 0.55, 2, 4);
    ctx.fillRect(x + s * 0.65, y + s * 0.3, 2, 4);
  }
}

export function dibujarFondo(ctx) {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const tipo = MAPA[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      ctx.fillStyle = COLOR_TILE[tipo];
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      dibujarDetalleTile(ctx, tipo, x, y);
    }
  }
}
