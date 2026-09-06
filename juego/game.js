import { PERSONAJES, DEPARTAMENTOS } from "./characters.js";
import { TILE_SIZE, MAP_COLS, MAP_ROWS, esSolido, dibujarFondo } from "./world.js";

const STORAGE_KEY = "te-juego-descubiertos";
const VEL_TIPEO_MS = 28;
const SPRITE_PX = 16; // lado del sprite pixelado offscreen (retratos reales)
const VELOCIDAD = 110; // px/segundo de movimiento del jugador
const HITBOX = 20; // lado del hitbox de colisión, centrado en el tile del jugador
const INICIO = { col: 11, row: 11 };
const COLOR_ORANGE = "#e0680e";
const COLOR_GOLD = "#f4b044";

const screenIntro = document.getElementById("screen-intro");
const screenMundo = document.getElementById("screen-mundo");
const screenDialogo = document.getElementById("screen-dialogo");
const canvas = document.getElementById("canvas-mundo");
const ctx = canvas.getContext("2d");
const dialogoRetrato = document.getElementById("dialogo-retrato");
const dialogoNombre = document.getElementById("dialogo-nombre");
const dialogoTexto = document.getElementById("dialogo-texto");
const dialogoAvanzar = document.getElementById("dialogo-avanzar");
const dialogoCaja = document.getElementById("dialogo-caja");
const dialogoCierre = document.getElementById("dialogo-cierre");
const dialogoEscena = document.getElementById("dialogo-escena");

canvas.width = MAP_COLS * TILE_SIZE;
canvas.height = MAP_ROWS * TILE_SIZE;

let personajeActual = null;
let paginaActual = 0;
let tipeoTimer = null;
let tipeoCompleto = false;

// ---------- Progreso (descubiertos) ----------

function getDescubiertos() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function marcarDescubierto(id) {
  const set = getDescubiertos();
  set.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ponytail: localStorage puede fallar (modo privado, cuota); el juego
    // sigue funcionando, solo no se recuerda entre sesiones.
  }
}

// ---------- Retratos reales pixelados ----------
// Se dibuja la foto en un canvas offscreen pequeño con el suavizado
// desactivado, y ese canvas pixelado se reutiliza como sprite en el mundo
// (game loop) y como retrato grande en la caja de diálogo (vía data URL +
// `image-rendering: pixelated` en CSS).

PERSONAJES.forEach((p) => {
  if (!p.retrato) return;
  const img = new Image();
  img.onload = () => {
    const off = document.createElement("canvas");
    off.width = SPRITE_PX;
    off.height = SPRITE_PX;
    const octx = off.getContext("2d");
    octx.imageSmoothingEnabled = false;
    const lado = Math.min(img.width, img.height);
    octx.drawImage(img, (img.width - lado) / 2, 0, lado, lado, 0, 0, SPRITE_PX, SPRITE_PX);
    p._sprite = off;
    p._spriteURL = off.toDataURL();
  };
  img.src = p.retrato;
});

function renderAvatarHTML(p) {
  if (p._spriteURL) {
    return `<img src="${p._spriteURL}" alt="${p.nombre}" class="pixelated" />`;
  }
  if (p.retrato) {
    return `<img src="${p.retrato}" alt="${p.nombre}" />`;
  }
  return `<div class="avatar-placeholder">${p.iniciales}</div>`;
}

// ---------- Fondo del mapa (estático, se dibuja una sola vez) ----------

const fondo = document.createElement("canvas");
fondo.width = MAP_COLS * TILE_SIZE;
fondo.height = MAP_ROWS * TILE_SIZE;
dibujarFondo(fondo.getContext("2d"));

// ---------- Jugador ----------

const player = {
  x: INICIO.col * TILE_SIZE,
  y: INICIO.row * TILE_SIZE,
  dir: "down",
  moving: false,
};

const teclas = new Set();
let blockedNpcId = null; // evita reabrir el diálogo en bucle mientras se sigue chocando con el mismo NPC
let rafId = null;
let ultimoFrame = 0;

function mostrarPantalla(pantalla) {
  screenIntro.hidden = pantalla !== "intro";
  screenMundo.hidden = pantalla !== "mundo";
  screenDialogo.hidden = pantalla !== "dialogo";
}

function pararMundo() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function irAlMundo() {
  mostrarPantalla("mundo");
  blockedNpcId = null; // permite volver a hablar con quien se acaba de cerrar
  if (!rafId) {
    ultimoFrame = performance.now();
    rafId = requestAnimationFrame(bucle);
  }
}

// ---------- Colisión ----------

function npcEnCelda(col, row) {
  return PERSONAJES.find((p) => p.posicion.col === col && p.posicion.row === row) || null;
}

// Devuelve null si la celda está libre, "muro" si topa con tile sólido/borde,
// o el personaje si topa con un NPC.
function colisionEn(x, y) {
  const off = (TILE_SIZE - HITBOX) / 2;
  const left = x + off;
  const top = y + off;
  const colMin = Math.floor(left / TILE_SIZE);
  const colMax = Math.floor((left + HITBOX - 1) / TILE_SIZE);
  const rowMin = Math.floor(top / TILE_SIZE);
  const rowMax = Math.floor((top + HITBOX - 1) / TILE_SIZE);

  for (let r = rowMin; r <= rowMax; r++) {
    for (let c = colMin; c <= colMax; c++) {
      const npc = npcEnCelda(c, r);
      if (npc) return npc;
      if (esSolido(c, r)) return "muro";
    }
  }
  return null;
}

function actualizarJugador(dt) {
  let dx = 0;
  let dy = 0;
  if (teclas.has("up")) dy -= 1;
  if (teclas.has("down")) dy += 1;
  if (teclas.has("left")) dx -= 1;
  if (teclas.has("right")) dx += 1;

  player.moving = dx !== 0 || dy !== 0;
  if (dy < 0) player.dir = "up";
  else if (dy > 0) player.dir = "down";
  if (dx < 0) player.dir = "left";
  else if (dx > 0) player.dir = "right";

  if (!player.moving) return;

  const largo = Math.hypot(dx, dy) || 1; // normaliza la diagonal
  const paso = (VELOCIDAD * dt) / 1000;
  const pasoX = (dx / largo) * paso;
  const pasoY = (dy / largo) * paso;

  let npcTopado = null;

  if (pasoX !== 0) {
    const choque = colisionEn(player.x + pasoX, player.y);
    if (choque === null) player.x += pasoX;
    else if (choque !== "muro") npcTopado = choque;
  }
  if (pasoY !== 0) {
    const choque = colisionEn(player.x, player.y + pasoY);
    if (choque === null) player.y += pasoY;
    else if (choque !== "muro") npcTopado = npcTopado || choque;
  }

  if (npcTopado) {
    if (blockedNpcId !== npcTopado.id) {
      blockedNpcId = npcTopado.id;
      abrirDialogo(npcTopado);
    }
  } else {
    blockedNpcId = null;
  }
}

// ---------- Dibujo ----------

function dibujarNPC(p, ahora) {
  const x = p.posicion.col * TILE_SIZE;
  const y = p.posicion.row * TILE_SIZE;
  if (p._sprite) {
    ctx.drawImage(p._sprite, x, y, TILE_SIZE, TILE_SIZE);
  } else {
    ctx.fillStyle = "#18374b";
    ctx.fillRect(x + 6, y + 16, TILE_SIZE - 12, 12);
    ctx.fillStyle = p.colorSprite;
    ctx.fillRect(x + 8, y + 4, TILE_SIZE - 16, 12);
    ctx.fillStyle = "#faf5ec";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(p.iniciales, x + TILE_SIZE / 2, y + 25);
  }
  if (getDescubiertos().has(p.id)) {
    ctx.fillStyle = COLOR_GOLD;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("★", x + TILE_SIZE / 2, y - 2 + Math.sin(ahora / 300) * 2);
  }
}

function dibujarJugador() {
  const bob = player.moving && Math.floor(performance.now() / 150) % 2 === 0 ? 1 : 0;
  ctx.save();
  if (player.dir === "left") {
    ctx.translate(player.x + TILE_SIZE, player.y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(player.x, player.y);
  }
  ctx.fillStyle = COLOR_GOLD;
  ctx.fillRect(6, 16 + bob, 20, 13);
  ctx.fillStyle = COLOR_ORANGE;
  ctx.fillRect(8, 4 + bob, 16, 13);
  ctx.fillStyle = "#112532";
  if (player.dir === "down") {
    ctx.fillRect(11, 9 + bob, 3, 3);
    ctx.fillRect(18, 9 + bob, 3, 3);
  } else if (player.dir === "up") {
    ctx.fillRect(11, 6 + bob, 3, 2);
    ctx.fillRect(18, 6 + bob, 3, 2);
  } else {
    ctx.fillRect(19, 9 + bob, 3, 3); // izquierda usa el mismo dibujo, se voltea con ctx.scale
  }
  ctx.restore();
}

function bucle(t) {
  const dt = t - ultimoFrame;
  ultimoFrame = t;
  actualizarJugador(dt);

  if (screenMundo.hidden) {
    rafId = null; // un diálogo pausó el mundo; irAlMundo() lo reinicia
    return;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(fondo, 0, 0);
  const ahora = performance.now();
  PERSONAJES.forEach((p) => dibujarNPC(p, ahora));
  dibujarJugador();
  rafId = requestAnimationFrame(bucle);
}

// ---------- Diálogo (igual que antes: máquina de escribir + cierre) ----------

function abrirDialogo(p) {
  pararMundo();
  personajeActual = p;
  paginaActual = 0;
  dialogoRetrato.innerHTML = renderAvatarHTML(p);
  dialogoNombre.textContent = `${p.nombre} · ${p.rol}`;
  dialogoCierre.hidden = true;
  dialogoCaja.hidden = false;
  dialogoEscena.hidden = false;
  mostrarPantalla("dialogo");
  mostrarPagina();
}

function mostrarPagina() {
  clearTimeout(tipeoTimer);
  const texto = personajeActual.paginas[paginaActual];
  dialogoTexto.textContent = "";
  dialogoAvanzar.hidden = true;
  tipeoCompleto = false;

  let i = 0;
  function paso() {
    dialogoTexto.textContent = texto.slice(0, i);
    i++;
    if (i <= texto.length) {
      tipeoTimer = setTimeout(paso, VEL_TIPEO_MS);
    } else {
      tipeoCompleto = true;
      dialogoAvanzar.hidden = false;
    }
  }
  paso();
}

function avanzarDialogo() {
  if (!tipeoCompleto) {
    clearTimeout(tipeoTimer);
    dialogoTexto.textContent = personajeActual.paginas[paginaActual];
    tipeoCompleto = true;
    dialogoAvanzar.hidden = false;
    return;
  }

  paginaActual++;
  if (paginaActual < personajeActual.paginas.length) {
    mostrarPagina();
  } else {
    marcarDescubierto(personajeActual.id);
    mostrarCierre();
  }
}

function mostrarCierre() {
  dialogoCaja.hidden = true;
  dialogoEscena.hidden = true;
  dialogoCierre.hidden = false;
  const deps = personajeActual.departamentos
    .map((id) => DEPARTAMENTOS[id])
    .filter(Boolean);
  dialogoCierre.innerHTML = `
    <p class="texto-cierre">${personajeActual.cierre}</p>
    <div class="departamentos">
      ${deps.map((d) => `<span class="chip-departamento">${d.icono} ${d.nombre}</span>`).join("")}
    </div>
    <div class="botones">
      <button type="button" class="btn-pixel" id="btn-volver-mundo">Seguir explorando</button>
      <a class="btn-pixel secondary" href="https://telecoemprende.es/#departamentos">Volver a TelecoEmprende</a>
    </div>
  `;
  document.getElementById("btn-volver-mundo").addEventListener("click", irAlMundo);
}

// ---------- Eventos globales ----------

document.getElementById("btn-empezar").addEventListener("click", irAlMundo);

document.getElementById("btn-salir-dialogo").addEventListener("click", () => {
  clearTimeout(tipeoTimer);
  irAlMundo();
});

dialogoCaja.addEventListener("click", avanzarDialogo);

const TECLAS_DIR = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

document.addEventListener("keydown", (e) => {
  const dir = TECLAS_DIR[e.key];
  if (dir && !screenMundo.hidden) {
    teclas.add(dir);
    e.preventDefault();
    return;
  }

  if (!screenDialogo.hidden && !dialogoCaja.hidden) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      avanzarDialogo();
    } else if (e.key === "Escape") {
      clearTimeout(tipeoTimer);
      irAlMundo();
    }
  }
});

document.addEventListener("keyup", (e) => {
  const dir = TECLAS_DIR[e.key];
  if (dir) teclas.delete(dir);
});

// ---------- Cruceta táctil (móvil) ----------

document.querySelectorAll(".dpad-btn").forEach((btn) => {
  const dir = btn.dataset.dir;
  const activar = (e) => {
    e.preventDefault();
    teclas.add(dir);
  };
  const desactivar = () => teclas.delete(dir);
  btn.addEventListener("pointerdown", activar);
  btn.addEventListener("pointerup", desactivar);
  btn.addEventListener("pointerleave", desactivar);
  btn.addEventListener("pointercancel", desactivar);
});

mostrarPantalla("intro");
