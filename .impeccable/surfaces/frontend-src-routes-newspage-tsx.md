---
version: 1
slug: "frontend-src-routes-newspage-tsx"
primary_target: "frontend/src/routes/NewsPage.tsx"
related_targets: ["frontend/news/index.html","frontend/src/styles/news.css"]
---

# /news — surface brief

## Scope and mode
Ruta pública `/news` de telecoemprende.es, más su entrada «Noticias» en la navegación y un bloque «Últimas noticias» en la home. Mode: **Read**.

## Audience, job, content
Estudiantes UPM y socios que llegan desde el enlace del briefing de WhatsApp: vistazo de 1-2 minutos en el móvil, leer titulares, abrir una fuente. Contenido: API `GET https://n8n.telecoemprende.es/webhook/noticias` (lista por `tema`/`dias`/`limite`, detalle por `id`): titular, qué pasó, por qué importa, tema, relevancia, fecha, fuentes. Nunca texto de prensa.

## Constraints
Mundo visual del club sin cambios (tokens.css, Anton + Space Grotesk, secciones papel/azul). CSS plano con prefijo propio, colores solo vía tokens. CSP `connect-src` debe permitir el dominio de la API. Movimiento solo con transform/opacity y `prefers-reduced-motion`.

## Direction contract
THESIS: la semana como la agenda de un estudiante; rechaza el feed infinito y la rejilla de tarjetas iguales.
OWN-WORLD: franjas por día a todo el ancho; hoy en azul TE con fecha Anton gigante y ámbar; días pasados sobre papel, plegados; pastillas de tema como las etiquetas del club.
STORY: el visitante ve primero lo que importa hoy, entiende por qué le afecta, abre la fuente y, si quiere, repasa la semana o se inscribe.
FIRST VIEWPORT: franja azul «HOY · VIE 25» con la fecha a escala de titular; debajo, la noticia más relevante abierta (tema, titular, por qué importa, fuentes) y las siguientes como filas; pastillas de tema fijas bajo la navegación.
FORM: agenda de la semana, puesto 5 de 7 en mi lista, seed 80c73763 (reroll 1). Firma: plegar y desplegar días; tocar una fila la abre en su sitio.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
Tope de noticias abiertas por día y cuántos días muestra el muro (propuesta: 7).
