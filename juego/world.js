// Mapa del "overworld" del juego (estilo Pokémon): representa de forma
// estilizada el campus de la ETSIT-UPM. Aquí solo viven los datos del mapa
// (tiles + colisión + textura); el jugador, los NPCs y el bucle de juego
// están en game.js.

export const TILE_SIZE = 32;
export const MAP_COLS = 24;
export const MAP_ROWS = 16;

// Tiles no transitables. Todo lo que no esté aquí se puede pisar.
const SOLIDOS = new Set([
  "scrub",
  "edificioC",
  "hall",
  "biblioteca",
  "cemdatic",
  "secretaria",
  "arbol",
  "coche",
  "banco",
]);

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

  rect(mapa, 3, 2, 6, 6, "edificioC"); // Edificio C
  rect(mapa, 10, 2, 17, 3, "hall"); // Hall / nave larga
  rect(mapa, 11, 5, 13, 6, "cemdatic"); // CEMDATIC (ala izquierda)
  rect(mapa, 14, 5, 16, 6, "biblioteca"); // Biblioteca ETSIT (ala derecha)
  rect(mapa, 11, 9, 16, 10, "secretaria"); // Secretaría de Alumnos
  rect(mapa, 3, 10, 5, 12, "sports"); // Pista de atletismo, transitable
  rect(mapa, 7, 7, 19, 8, "plaza"); // Plaza/paso central

  // Caminos peatonales: conectan plaza, Edificio C, pista y salida sur.
  rect(mapa, 2, 13, 17, 13, "camino"); // eje sur
  rect(mapa, 10, 9, 10, 13, "camino"); // plaza -> eje sur (por la izquierda de Secretaría)
  rect(mapa, 7, 9, 7, 12, "camino");
  rect(mapa, 4, 7, 4, 9, "camino"); // salida sur del Edificio C

  // Aparcamiento noreste, con coches aparcados en las filas de plazas.
  rect(mapa, 19, 2, 22, 5, "parking");
  for (const [c, r] of [[19, 2], [20, 2], [22, 2], [19, 5], [21, 5], [22, 5]]) {
    mapa[r][c] = "coche";
  }

  // Rotonda de entrada (sureste): anillo de asfalto con isla ajardinada.
  rect(mapa, 18, 10, 21, 13, "asfalto");
  rect(mapa, ROTONDA.c0, ROTONDA.r0, ROTONDA.c1, ROTONDA.r1, "arbol");

  // Arbolado: alineaciones de árboles entre edificios y por los bordes.
  const arboles = [
    [8, 4], [18, 4], // los dos originales
    [2, 1], [5, 1], [9, 1], [14, 1], [21, 1],
    [2, 3], [2, 5], [2, 7], [2, 9], [2, 11],
    [8, 2], [8, 6], [18, 2], [18, 6],
    [6, 10], [6, 12], [8, 10],
    [3, 14], [6, 14], [9, 14], [12, 14], [15, 14], [18, 14], [21, 14],
  ];
  for (const [c, r] of arboles) mapa[r][c] = "arbol";

  // Bancos junto a la plaza.
  mapa[9][17] = "banco";
  mapa[11][17] = "banco";

  return mapa;
}

// Isla central de la rotonda (2x2). Se usa también para pintar el anillo.
const ROTONDA = { c0: 19, r0: 11, c1: 20, r1: 12 };

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
  cemdatic: "#bda87e",
  secretaria: "#ab9877",
  sports: "#a8563a",
  plaza: "#d8c9a3",
  camino: "#c9b98f",
  asfalto: "#4b4b52",
  parking: "#55555c",
  coche: "#55555c",
  arbol: "#2f6b3d",
  banco: "#2f6b3d",
};

const EDIFICIOS = new Set(["edificioC", "hall", "biblioteca", "cemdatic", "secretaria"]);

// Tiles de edificio que llevan puerta dibujada (fachada sur de cada bloque).
const ENTRADAS = new Set(["4,6", "13,3", "12,6", "15,6", "13,10"]);

const COLOR_COCHE = ["#c0483c", "#3f6ea8", "#d9d2c6", "#e0a53a"];

// Ruido determinista por celda: la misma textura en cada repintado.
function variacion(c, r) {
  return (c * 7 + r * 13) % 5;
}

function mismoTipo(c, r, tipo) {
  if (c < 0 || r < 0 || c >= MAP_COLS || r >= MAP_ROWS) return false;
  return MAPA[r][c] === tipo;
}

function dibujarEdificio(ctx, tipo, x, y, c, r) {
  const s = TILE_SIZE;
  const arriba = mismoTipo(c, r - 1, tipo);
  const abajo = mismoTipo(c, r + 1, tipo);
  const izq = mismoTipo(c - 1, r, tipo);
  const der = mismoTipo(c + 1, r, tipo);

  if (ENTRADAS.has(`${c},${r}`)) {
    ctx.fillStyle = "#4a3520"; // puerta
    ctx.fillRect(x + s * 0.28, y + s * 0.45, s * 0.44, s * 0.55);
    ctx.fillStyle = "#f4b044"; // dintel iluminado
    ctx.fillRect(x + s * 0.28, y + s * 0.41, s * 0.44, s * 0.06);
  } else {
    // Rejilla de ventanas con un reflejo claro arriba, para dar profundidad.
    const vy = y + (arriba ? s * 0.24 : s * 0.46);
    ctx.fillStyle = "rgba(17, 37, 50, 0.55)";
    ctx.fillRect(x + s * 0.18, vy, s * 0.22, s * 0.22);
    ctx.fillRect(x + s * 0.6, vy, s * 0.22, s * 0.22);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(x + s * 0.18, vy, s * 0.22, s * 0.06);
    ctx.fillRect(x + s * 0.6, vy, s * 0.22, s * 0.06);
  }

  if (!arriba) {
    ctx.fillStyle = "#9a8358"; // tejado
    ctx.fillRect(x, y, s, s * 0.3);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; // canto del alero
    ctx.fillRect(x, y + s * 0.3 - 2, s, 2);
  }
  if (!abajo) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; // zócalo en sombra
    ctx.fillRect(x, y + s * 0.84, s, s * 0.16);
  }
  if (!der) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(x + s - 3, y, 3, s);
  }
  if (!izq) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(x, y, 3, s);
  }
}

function dibujarArbol(ctx, x, y) {
  const s = TILE_SIZE;
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)"; // sombra en el suelo
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.82, s * 0.28, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c3a1e"; // tronco
  ctx.fillRect(x + s / 2 - 2, y + s * 0.55, 4, s * 0.28);
  ctx.fillStyle = "#0f3319"; // copa en dos tonos
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.42, s * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2c6b34";
  ctx.beginPath();
  ctx.arc(x + s * 0.42, y + s * 0.34, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function dibujarCoche(ctx, x, y, c, r) {
  const s = TILE_SIZE;
  ctx.fillStyle = COLOR_COCHE[(c * 3 + r) % COLOR_COCHE.length];
  ctx.fillRect(x + s * 0.2, y + s * 0.12, s * 0.6, s * 0.76); // carrocería
  ctx.fillStyle = "rgba(20, 30, 45, 0.75)"; // lunas
  ctx.fillRect(x + s * 0.26, y + s * 0.22, s * 0.48, s * 0.16);
  ctx.fillRect(x + s * 0.26, y + s * 0.58, s * 0.48, s * 0.16);
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)"; // faros
  ctx.fillRect(x + s * 0.22, y + s * 0.12, s * 0.14, 3);
  ctx.fillRect(x + s * 0.64, y + s * 0.12, s * 0.14, 3);
}

function dibujarDetalleTile(ctx, tipo, x, y, c, r) {
  const s = TILE_SIZE;
  if (EDIFICIOS.has(tipo)) {
    dibujarEdificio(ctx, tipo, x, y, c, r);
  } else if (tipo === "arbol") {
    dibujarArbol(ctx, x, y);
  } else if (tipo === "coche") {
    dibujarCoche(ctx, x, y, c, r);
  } else if (tipo === "sports") {
    // Calles de la pista de atletismo + línea blanca en el borde del bloque.
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillRect(x, y + s * 0.33, s, 2);
    ctx.fillRect(x, y + s * 0.66, s, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    if (!mismoTipo(c, r - 1, tipo)) ctx.fillRect(x, y, s, 2);
    if (!mismoTipo(c, r + 1, tipo)) ctx.fillRect(x, y + s - 2, s, 2);
    if (!mismoTipo(c - 1, r, tipo)) ctx.fillRect(x, y, 2, s);
    if (!mismoTipo(c + 1, r, tipo)) ctx.fillRect(x + s - 2, y, 2, s);
  } else if (tipo === "plaza") {
    // Despiece del pavimento.
    ctx.strokeStyle = "rgba(120, 96, 58, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(x + s / 2, y, 1, s);
  } else if (tipo === "camino") {
    // Gravilla: puntitos estables por celda.
    ctx.fillStyle = "rgba(90, 70, 40, 0.28)";
    const v = variacion(c, r);
    ctx.fillRect(x + 5 + v * 3, y + 7, 2, 2);
    ctx.fillRect(x + 20 - v * 2, y + 18, 2, 2);
    ctx.fillRect(x + 11, y + 25 - v, 2, 2);
  } else if (tipo === "parking") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // marcas de plaza
    ctx.fillRect(x + 1, y + s * 0.1, 2, s * 0.8);
  } else if (tipo === "asfalto") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(x + variacion(c, r) * 5, y + 12, 3, 2);
  } else if (tipo === "banco") {
    ctx.fillStyle = "#7a5327"; // listones
    ctx.fillRect(x + s * 0.12, y + s * 0.38, s * 0.76, s * 0.14);
    ctx.fillRect(x + s * 0.12, y + s * 0.56, s * 0.76, s * 0.14);
    ctx.fillStyle = "#4a3520"; // patas
    ctx.fillRect(x + s * 0.18, y + s * 0.5, 3, s * 0.3);
    ctx.fillRect(x + s * 0.76, y + s * 0.5, 3, s * 0.3);
  } else if (tipo === "grass") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(x + s * 0.3, y + s * 0.55, 2, 4);
    ctx.fillRect(x + s * 0.65, y + s * 0.3, 2, 4);
    if (variacion(c, r) === 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)"; // mata más densa
      ctx.beginPath();
      ctx.arc(x + s * 0.5, y + s * 0.68, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tipo === "scrub") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.14)"; // piedras
    ctx.fillRect(x + 6 + variacion(c, r) * 2, y + 9, 3, 2);
    ctx.fillRect(x + 21, y + 20 - variacion(c, r), 3, 2);
  }
}

// Nombres de los edificios, centrados sobre su bloque de tiles.
const ETIQUETAS = [
  { texto: "EDIFICIO C", c0: 3, r0: 2, c1: 6, r1: 6 },
  { texto: "HALL", c0: 10, r0: 2, c1: 17, r1: 3 },
  { texto: "CEMDATIC", c0: 11, r0: 5, c1: 13, r1: 6 },
  { texto: "BIBLIOTECA", c0: 14, r0: 5, c1: 16, r1: 6 },
  { texto: "SECRETARÍA", c0: 11, r0: 9, c1: 16, r1: 10 },
  { texto: "DEPORTES", c0: 3, r0: 10, c1: 5, r1: 12 },
  { texto: "PARKING", c0: 19, r0: 2, c1: 22, r1: 5 },
];

function dibujarEtiquetas(ctx) {
  ctx.save();
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  for (const e of ETIQUETAS) {
    const x = ((e.c0 + e.c1 + 1) / 2) * TILE_SIZE;
    const y = ((e.r0 + e.r1 + 1) / 2) * TILE_SIZE;
    ctx.strokeStyle = "rgba(255, 246, 230, 0.9)";
    ctx.strokeText(e.texto, x, y);
    ctx.fillStyle = "#3a2a15";
    ctx.fillText(e.texto, x, y);
  }
  ctx.restore();
}

export function dibujarFondo(ctx) {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const tipo = MAPA[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      ctx.fillStyle = COLOR_TILE[tipo];
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      dibujarDetalleTile(ctx, tipo, x, y, c, r);
    }
  }

  // Marca vial de la rotonda alrededor de la isla ajardinada.
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.arc(
    ((ROTONDA.c0 + ROTONDA.c1 + 1) / 2) * TILE_SIZE,
    ((ROTONDA.r0 + ROTONDA.r1 + 1) / 2) * TILE_SIZE,
    TILE_SIZE * 1.45,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.restore();

  dibujarEtiquetas(ctx);
}
