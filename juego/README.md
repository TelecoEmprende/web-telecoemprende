# juego/

Servicio estático independiente de Vercel, servido en `/juego` (ver el
servicio `"juego"` en `vercel.json` de la raíz del repo: `root: "juego/"`,
sin framework declarado, sin build).

## "Elige tu camino"

Mini-juego estilo Pokémon: te mueves por un mapa del campus de la ETSIT y
hablas con ocho personas que han pasado por TelecoEmprende. Cada una cuenta
su historia en una escena de diálogo con efecto máquina de escribir, hasta
descubrir con qué departamento del club conecta su camino.

- `index.html` — las 3 pantallas (intro, mapa, diálogo).
- `game.js` — máquina de estados, movimiento por teclado/d-pad, efecto de
  tipeo, progreso guardado en `localStorage` (solo local a quien juega, no
  hay backend detrás).
- `world.js` — el mapa: tiles, colisiones y dibujo del fondo.
- `characters.js` — datos de los personajes (nombre, rol, foto, historia,
  departamento con el que conecta). Editar aquí para cambiar el contenido,
  no hace falta tocar `game.js`.
- `game.css` — estética pixel/retro con los colores de marca del club
  (copiados como valores literales de `frontend/src/styles/tokens.css`,
  porque este servicio no comparte CSS con el resto del sitio).
- `public/retratos/` — una foto por personaje.
- `check-estrellas.mjs` — comprobación mínima de que un personaje queda
  marcado como descubierto salga como salga del diálogo:
  `node juego/check-estrellas.mjs`.

Sin `npm install` ni paso de build: es HTML/CSS/JS plano con módulos ES
nativos del navegador, se sirve tal cual.
