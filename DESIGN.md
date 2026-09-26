---
name: TelecoEmprende
description: Web del club de emprendimiento de la UPM — landing, inscripción, /news y espacio de trabajo interno (/equipo, /admin).
colors:
  azul: "#1350b8"
  azul-profundo: "#0e43a0"
  azul-claro: "#a9c4f0"
  impulso: "#e0680e"
  chispa: "#f4b044"
  noche: "#112532"
  papel: "#f7f5f1"
  papel-hueso: "#ede9e2"
  superficie: "#ffffff"
  info-bg: "#fdf1dd"
  info-text: "#9a5b06"
  success-bg: "#e3f6e8"
  success-text: "#1d7a3d"
  error-bg: "#fde8ea"
  error-text: "#b42318"
typography:
  display:
    fontFamily: "Anton, Arial Narrow, Oswald, sans-serif"
    fontSize: "clamp(2.9rem, 6.4vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.012em"
  headline:
    fontFamily: "Anton, Arial Narrow, Oswald, sans-serif"
    fontSize: "clamp(2.15rem, 4vw, 3.1rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.02em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  md: "14px"
  lg: "20px"
  xl: "28px"
  circle: "999px"
spacing:
  gutter: "24px"
  container: "1180px"
  section: "120px"
components:
  button-primary:
    backgroundColor: "{colors.impulso}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.md}"
    padding: "0 26px"
    height: "54px"
  nav-cta:
    backgroundColor: "{colors.chispa}"
    textColor: "{colors.noche}"
    rounded: "{rounded.circle}"
    padding: "0 20px"
  chip-filtro:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.noche}"
    rounded: "{rounded.circle}"
    padding: "0 16px"
    height: "40px"
  chip-filtro-activo:
    backgroundColor: "{colors.noche}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.circle}"
  pastilla-tema:
    textColor: "{colors.noche}"
    typography: "{typography.label}"
    rounded: "{rounded.circle}"
    padding: "3px 10px 3px 8px"
  hoja-reglada:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.noche}"
    rounded: "{rounded.lg}"
  enlace-fuente:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.noche}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: TelecoEmprende

## Overview

**Creative North Star: "Azul de base, naranja de acción"**

La web aplica el Manual de Identidad Visual v2.0 (septiembre 2026) del club. Es un mundo de cartel universitario: bandas a sangre en Azul TE que alternan con secciones claras en papel, titulares en Anton siempre en mayúsculas, y un único disco naranja (el círculo del sistema gráfico) entrando por una esquina. Todo lo demás lo sostiene Inter, con texto Noche sobre Papel. El manual da una proporción de referencia por pieza: Azul 60 · Papel 22 · Impulso 10 · Chispa 5 · Noche 3.

La fuente normativa es `frontend/src/styles/tokens.css`; toda hoja del sitio público (`landing.css`, `home.css`, `news.css`) consume variables de ahí. El sitio tiene tres superficies con la misma paleta: la web pública (landing, inscripción, páginas legales y de gracias, prefijo `lp-`), `/news` (prefijo `nw-`, construida dentro del mismo mundo) y el espacio de trabajo `/equipo` + `/admin`, que usa Tailwind + shadcn/ui acotado bajo `.shadcn-scope` y reasigna las variables de shadcn (`--primary`, `--background`, `--border`, `--ring`, `--radius-*`) a los tokens de `tokens.css`. Ese espacio es un sistema aparte en componentes, no en color.

Aviso de divergencia: la sección «Brand» del `CLAUDE.md` del repo describe la paleta v1 (tinta, ámbar, naranja, acero) y Space Grotesk como fuente de cuerpo, con departamentos Tech = acero y Eventos = ámbar. El código usa la v2 descrita aquí (Inter; Tech = Azul, Marketing = Impulso, Eventos = Noche). Manda `tokens.css`.

**Key Characteristics:**
- Bandas completas de color alternas: Azul TE (hero, eventos, franja de hoy en /news) y Papel / Papel hueso.
- Anton 400 en mayúsculas para h1/h2; Inter para todo lo demás, incluido h3.
- Una sola acción sólida en Impulso por pantalla.
- Esquinas redondeadas en cajas, botones y campos (decisión del club frente a los rectángulos rectos del manual); el círculo es la forma gráfica.
- Movimiento corto (≤300 ms), con curvas propias y respeto de `prefers-reduced-motion`.

## Colors

Paleta cerrada de ocho colores de marca más tres pares de estado; ningún tono nuevo entra fuera de `tokens.css` (los alias v1 como `--color-navy` o `--color-gold` apuntan a colores v2).

### Primary
- **Azul TE** (`azul`): color de marca y fondo dominante de las bandas oscuras (hero, eventos, franja de hoy de /news). También enlaces, iconos de fuente, foco (`outline` 3px) y hover de titulares sobre papel.
- **Azul profundo** (`azul-profundo`): capas y formas sobre Azul TE; en /news, color del tema «tech».
- **Azul claro** (`azul-claro`): texto secundario y etiquetas sobre azul (4.1:1); nunca texto principal. Mezclado con Papel da los fondos de sección `steel-soft` (10%) y `steel-tint` (22%).

### Secondary
- **Impulso** (`impulso`): el color de acción. Botón principal, disco del sistema gráfico, punto activo de carruseles, «AYER» en los días pasados de /news. Nunca texto largo sobre azul (2.2:1).

### Tertiary
- **Chispa** (`chispa`): ilumina sobre azul. Enlace activo y CTA de la nav, palabra destacada del hero, «HOY» en la fecha de /news, selección de texto e icono del chip activo. Nunca texto pequeño sobre papel.

### Neutral
- **Noche** (`noche`): texto por defecto (14.9:1 sobre Papel), pie, chip de filtro activo. Texto atenuado = Noche al 72% (6:1). Nunca fondo dominante de una pantalla.
- **Papel** (`papel`): fondo claro por defecto de la web y de /news.
- **Papel hueso** (`papel-hueso`): secciones alternas, bordes y filetes de 1px (`--color-border`, `--color-divider`).
- **Superficie** (`superficie`): blanco de tarjetas, hojas y chips sobre papel.
- **Estados** (`info-*`, `success-*`, `error-*`): solo en avisos (`alert-banner`) y validación de formulario.

### Named Rules
**The Una Acción Rule.** Impulso marca lo que se pulsa primero, y solo una vez por pantalla: la acción secundaria del hero baja a enlace discreto.

**The Degradado Vecino Rule.** Solo existen tres degradados (profundidad, calor, contacto), siempre a 135° y entre colores vecinos, para fondos grandes; nunca en logo, iconos ni texto.

**The Tema Tinta Rule.** En /news cada tema tiene un token: inversión = Impulso, IA = Azul, startups = Chispa, finanzas = Noche, tech = Azul profundo. El color del tema solo tiñe el icono y el fondo de la pastilla (12% sobre blanco); el texto de la pastilla sigue en Noche.

## Typography

**Display Font:** Anton (con Arial Narrow, Oswald)
**Body Font:** Inter (con system-ui, -apple-system, Segoe UI)

**Character:** Anton grita en caja alta como un cartel; Inter, sobria y legible, sostiene el resto. Anton tiene un solo peso (400) y nunca se usa para un párrafo.

### Hierarchy
- **Display** (Anton 400, `clamp(2.9rem, 6.4vw, 5.5rem)` en el hero; `clamp(3.25rem, 10vw, 6rem)` en la fecha de /news, techo ~6rem en pantalla): titular único de la página.
- **Headline** (Anton 400, `clamp(2.15rem, 4vw, 3.1rem)`, 1.1, +0.02em): titular de sección. Los suelos globales en `base.css` son h1 `clamp(2.4rem, 5vw, 3.25rem)` y h2 `clamp(1.9rem, 3.4vw, 2.4rem)`, con `text-wrap: balance`.
- **Title** (Inter 700, 1.2–1.32rem, 1.3, −0.01/−0.02em): h3 de tarjetas y bloques.
- **Body** (Inter 400, 1rem–1.08rem, 1.55): lecturas limitadas a 62–72ch. Titulares de noticia en Inter 600 a ~1.06rem.
- **Label** (Inter 600–700, 0.76–0.92rem): pastillas, chips, nombre del medio de una fuente (700, 0.8rem, mayúsculas, +0.04em).

### Named Rules
**The Anton en Mayúsculas Rule.** Anton va siempre en mayúsculas, a ≥24px, con interlineado 1.1 como base (por debajo de 1 las tildes de dos líneas chocan) y +0.02em de tracking; los tamaños enormes pueden apretarlo desde su propia regla.

**The h3 es Inter Rule.** Solo h1 y h2 son Anton; h3 y todo lo inferior es Inter 700.

## Layout

Contenedor centrado de 1180px con 24px de margen lateral (18px en móvil). La página es una pila de bandas a sangre de ancho completo con relleno vertical generoso (92–124px en escritorio, 48–88px en móvil); el contenido vive dentro del contenedor. La navegación es sticky arriba; en /news el filtro de temas se pega justo debajo. Las rejillas de tarjetas (departamentos, requisitos, eventos) usan CSS grid y colapsan a una columna. Puntos de corte observados: 980px, 720px (el principal) y ajustes a 620/420px. Los estados hover van siempre dentro de `@media (hover: hover) and (pointer: fine)`.

En /news la semana se lee como agenda: hoy en una franja azul con la fecha como h1; cada día es una hoja blanca con filas regladas; la noticia abierta se reparte en dos columnas en escritorio (por qué importa + qué pasó | fuentes) y en una en móvil, en orden por qué importa → fuentes → qué pasó. Los días pasados van sobre papel, plegados, con fecha, titular principal y recuento.

## Elevation & Depth

Sistema mayormente plano con una sola sombra ambiental. Las tarjetas de la landing (equipo, requisitos, departamentos, gracias) flotan sobre papel con una sombra difusa en Noche; los botones son planos, sin sombra ni degradado. La profundidad principal no es sombra sino color: bandas azules frente a papel y el disco naranja detrás del contenido.

### Shadow Vocabulary
- **Sombra suave** (`box-shadow: 0 16px 40px rgba(17, 37, 50, 0.08)`, `--shadow-soft`): tarjetas blancas sobre papel en la landing.
- **Anillo de foco de campo** (`box-shadow: 0 0 0 4px rgba(224, 104, 14, 0.12)`): campos del formulario en foco.

### Named Rules
**The Hoja sin Sombra Rule.** Las listas de /news y de la home son hojas blancas o listas sobre papel con filetes de 1px en Papel hueso; ninguna fila lleva sombra ni caja propia.

## Shapes

Esquinas redondeadas en todo lo que se toca: campos y botones a 14px (`rounded.md`), hojas y paneles a 20px (`rounded.lg`), tarjetas de gracias a 28px (`rounded.xl`), y pastillas, chips y toggles completamente redondos (`rounded.circle`). La geometría gráfica del manual es el círculo: un disco sólido por pieza, en Impulso, entrando por una esquina (abajo a la derecha en el hero; arriba a la derecha con halo de Azul claro al 22% en la franja de hoy de /news).

## Components

### Buttons
Planos, grandes y seguros.
- **Shape:** esquinas suaves (14px).
- **Primary:** Impulso con texto blanco a 1.125rem, 700, alto mínimo 54px (el blanco sobre Impulso solo pasa a ≥18px).
- **Hover / Focus:** sube 2px y brillo 1.06 (solo con puntero fino); al pulsar, `scale(0.97)`.
- **Ghost (sobre azul):** transparente con borde blanco al 50%; hover al 90% con fondo blanco al 10%.
- **CTA de la nav:** pastilla en Chispa con texto Noche.

### Chips
- **Filtro de tema (/news):** pastilla blanca, borde 1px Papel hueso, Inter 600, 40px de alto, icono en el color del tema; hover pasa el borde a Azul claro.
- **Activo:** `aria-pressed="true"` rellena en Noche con texto blanco e icono en Chispa.
- **Pastilla de tema:** misma forma, en línea con el titular, fondo del tema al 12% sobre blanco.

### Cards / Containers
- **Corner Style:** 24px en las tarjetas de la landing; 20px en hojas de /news.
- **Background:** blanco sobre papel; sobre azul, blanco al 7% con filete blanco al 12%.
- **Shadow Strategy:** sombra suave en la landing; ninguna en /news.
- **Border:** 1px Papel hueso.
- **Internal Padding:** 20–30px.

### Inputs / Fields
- **Style:** fondo blanco, esquinas de 16px, flecha de select dibujada en Impulso.
- **Focus:** anillo de 4px en Impulso al 12%.
- **Error:** texto y fondo de los tokens `error-*` en el banner de aviso.

### Navigation
Barra sticky en Noche al 88% con el nombre del club en Anton (acento en Chispa). Enlaces Inter 600 en Azul claro; hover y activo en Chispa con subrayado de 2px en Chispa. En móvil se abre en un panel Noche con sombra.

### Hoja de noticias (/news)
Firma de /news. Lista `ol` blanca, radio 20px, filas separadas por 1px de Papel hueso. Cada fila es un botón con titular + pastilla de tema + chevron; al abrir, la fila del grid pasa de `0fr` a `1fr` sin animarse y solo el contenido se funde y baja 6px (opacity 220ms, transform 280ms). Las fuentes son enlaces en Papel con radio 14px, nombre del medio en Azul mayúsculas y título a dos líneas. En la home, «Lo que importa hoy» usa la misma lista reglada sin hoja, enlazando a `/news#noticia-<id>`.

## Do's and Don'ts

### Do:
- **Do** sacar todo color de `tokens.css`; si un hex aparece a mano en otra hoja, se ha escapado de la marca.
- **Do** alternar bandas Azul TE y Papel / Papel hueso a ancho completo.
- **Do** usar blanco para texto principal sobre azul y Azul claro solo para el secundario.
- **Do** usar `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) y duraciones de 150–280ms; nada de la interfaz pasa de 300ms.
- **Do** animar solo `opacity` y `transform`, y dejar que `prefers-reduced-motion` quite desplazamientos y escalas conservando fundidos y cambios de color.
- **Do** poner el hover dentro de `@media (hover: hover) and (pointer: fine)`.

### Don't:
- **Don't** usar Noche como fondo dominante de una pantalla.
- **Don't** poner Impulso como texto largo sobre azul ni Chispa como texto pequeño sobre papel.
- **Don't** poner más de un disco del sistema gráfico por pieza.
- **Don't** escribir Anton en minúsculas, por debajo de 24px ni en párrafos.
- **Don't** usar degradados distintos de los tres del manual, ni sobre logo, iconos o texto.
- **Don't** dar sombra o caja propia a cada fila de una lista de noticias.
