# juego/

Servicio estático independiente de Vercel, servido en `/juego` (ver el
servicio `"juego"` en `vercel.json` de la raíz del repo: `root: "juego/"`,
sin framework declarado, sin build).

## "Elige tu camino"

Mini-juego estilo Pokémon: eliges a una de seis personas que han pasado por
TelecoEmprende y lees su historia en una escena de diálogo con efecto
máquina de escribir, hasta descubrir con qué departamento del club conecta
su camino.

- `index.html` — las 3 pantallas (intro, selección, diálogo).
- `game.js` — máquina de estados, navegación por teclado/clic, efecto de
  tipeo, progreso guardado en `localStorage` (solo local a quien juega, no
  hay backend detrás).
- `characters.js` — datos de los 6 personajes (nombre, rol, foto o
  iniciales-placeholder, texto de la historia, departamento con el que
  conecta). Editar aquí para cambiar el contenido, no hace falta tocar
  `game.js`.
- `game.css` — estética pixel/retro con los colores de marca del club
  (copiados como valores literales de `frontend/src/styles/tokens.css`,
  porque este servicio no comparte CSS con el resto del sitio).
- `public/retratos/` — fotos reales de Carlos Herrera, Ignacio García
  Carrillo y Samuel Gil. Rebeca Minguela, Nuria Oliver y Natalia Rodríguez
  no tienen foto en el repo todavía: se ven con un avatar de iniciales
  (`retrato: null` en `characters.js`) hasta que se suba una foto real.

**Pendiente:** la biografía de Natalia Rodríguez en `characters.js` está
marcada con un `TODO` — está escrita en términos genéricos porque no hay
datos verificados de su trayectoria concreta. Confirmar y completar antes
de darlo por publicado del todo.

Sin `npm install` ni paso de build: es HTML/CSS/JS plano con módulos ES
nativos del navegador, se sirve tal cual.
