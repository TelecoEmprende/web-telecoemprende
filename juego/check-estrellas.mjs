// Comprobación mínima (sin frameworks) del bug de las estrellas: un
// personaje debía marcarse "descubierto" nada más abrir su diálogo, porque
// hay tres formas de salir de una conversación (fin natural del guion,
// "✕ Salir", Escape) y solo una de ellas pasaba antes por marcarDescubierto.
// Ejecutar con: node juego/check-estrellas.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ FALLO: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(dir, "game.js"), "utf8");

// 1) La única fuente de verdad de "conocido" tiene que vivir en abrirDialogo:
//    es la única función por la que pasan las tres salidas del diálogo
//    (fin de guion, botón "✕ Salir" y Escape).
const abrirDialogo = src.slice(
  src.indexOf("function abrirDialogo"),
  src.indexOf("function mostrarPaso")
);
assert(
  /marcarDescubierto\(p\.id\)/.test(abrirDialogo),
  "abrirDialogo() marca al personaje como descubierto al abrir el diálogo"
);

// 2) Regresión concreta del bug: NO debe quedar ligado solo al final del
//    guion (si vuelve a estar solo ahí, "✕ Salir"/Escape vuelven a bypassearlo).
const avanzarDialogo = src.slice(
  src.indexOf("function avanzarDialogo"),
  src.indexOf("function mostrarCierre")
);
assert(
  !/marcarDescubierto/.test(avanzarDialogo),
  "avanzarDialogo() ya no es la única vía para marcar descubierto"
);

// 3) Los dos caminos de salida temprana (✕ Salir y Escape) siguen llamando a
//    irAlMundo() sin pasar por marcarDescubierto explícitamente — lo cual ya
//    no es un problema, PORQUE la marca ocurrió al abrir. Confirmamos que
//    ambos manejadores siguen existiendo (si se borran, esta prueba no vale).
assert(
  /getElementById\("btn-salir-dialogo"\)\.addEventListener\("click"/.test(src),
  "el botón ✕ Salir sigue existiendo (si desaparece, revisa este check)"
);
assert(
  /e\.key === "Escape"/.test(src),
  "la tecla Escape sigue cerrando el diálogo (si desaparece, revisa este check)"
);

console.log("\nBug de las estrellas: comprobación OK.");
