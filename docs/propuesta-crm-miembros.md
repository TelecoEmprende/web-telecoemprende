# Propuesta: Marketing como CRM del equipo

Escrito por Abril (con Claude) el 7 de septiembre de 2026. **Nada de esto está
construido** — es una propuesta con mockups para que se decida qué se hace y
quién lo hace. Si la ejecutas tú (Hammad), este documento es el punto de
partida: pásaselo a tu Claude tal cual, junto con
[`docs/mockups/crm-miembros.html`](mockups/crm-miembros.html) (ábrelo en el
navegador para ver los mockups con colores y tipografía reales del sitio).

## La idea de fondo

La pestaña "Miembros" de Marketing hoy es un listado con foto y email
(`backend/api/marketing.py:api_miembros`, que lee de `equipo_accesos` — tu
tabla, solo lectura). Alrededor ya hay tareas, campañas y responsables: es
la materia prima de un CRM, solo que no se está usando como tal. La
propuesta son tres piezas que lo acercan a eso.

## ⚠️ Decisión pendiente: ¿Marketing o `/admin`?

Esto no lo he decidido yo — depende de cómo lo veas tú, que eres quien
mantiene `equipo_accesos` y `/admin`.

**Opción A — todo vive en Marketing.** Etiquetas de habilidad y notas
privadas se guardan en una tabla nueva propia de Marketing (algo como
`marketing_miembros_meta(email, tags, notas)`), scoped al departamento.
Rápido de construir, no toca nada tuyo, pero si Eventos o Ingeniería quieren
lo mismo algún día, lo reconstruyen por su cuenta.

**Opción B — vive en `equipo_accesos`, se ve desde Marketing.** Añades
columnas a tu tabla (`tags TEXT[]`, `notas TEXT` o similar) y las gestionas
desde `/admin` como el resto de la ficha de acceso; Marketing solo las
**lee** (como ya hace con `email`/`equipos`/`activo`). Más correcto a largo
plazo — es información de la persona, no del departamento —, pero significa
tocar tu tabla y tu panel de admin.

Mi intuición es la B (evita que cada departamento reinvente lo mismo), pero
es tu tabla — decide tú. Todo lo de abajo asume la B por defecto; si eliges
A, cambia dónde vive el dato y quién puede escribirlo, la UI es igual.

## 01 — Directorio con carga de trabajo y habilidades

**Impacto alto · esfuerzo bajo.** No hace falta tabla nueva para la carga de
trabajo: ya existe `tasks.responsables` (`TEXT[]` de emails). Un
`COUNT` de tareas con `estado != 'acabado'` por email, agrupado, da el chip
de "3 tareas abiertas" / "Libre". Las etiquetas de habilidad sí son dato
nuevo (ver decisión de arriba).

- Backend: nueva función en `backend/services/marketing.py`, algo como
  `carga_por_miembro() -> dict[str, int]` (un `GROUP BY unnest(responsables)`
  sobre `tasks` filtrando por `estado`), y sumarlo a la respuesta de
  `api_miembros`.
- Frontend: `MembersPanel.tsx` — chip de carga junto al email, filtro de
  habilidad arriba (una fila de `.mkt-btn-mini-react` a modo de toggle, ver
  mockup).
- Mockup: sección "01" del HTML adjunto.

## 02 — Ficha de miembro

**Impacto alto · esfuerzo medio.** Es la pieza central; las otras dos
cuelgan de esta. Al tocar una fila del directorio, se abre un panel (mismo
patrón que `TaskDialog.tsx`: `Dialog` de shadcn) con:

- Contacto y habilidades (arriba).
- Tres números: tareas abiertas / completadas / campañas en las que ha
  participado — todo derivable de `tasks` y `campaigns`, sin tabla nueva.
- Historial de actividad: un timeline simple, `SELECT` de tareas por
  `responsable` ordenado por `updated_at DESC` con `LIMIT`. No hace falta
  una tabla de eventos aparte, con leer el estado actual de tareas/campañas
  ordenado por fecha ya sale una historia razonable.
- Nota privada: campo de texto libre, solo visible dentro de Marketing (o de
  `/admin`, según la decisión de arriba). Este si es dato nuevo de verdad.
- Botón "+ Asignar tarea": abre `TaskDialog`/el formulario de nueva tarea con
  `responsables` prellenado a ese email.

Mockup: sección "02" del HTML adjunto.

## 03 — Salud del equipo

**Impacto medio · esfuerzo medio.** Cuatro números arriba (miembros activos,
sin tocar una tarea en +15 días, sobrecargados, % de tareas a tiempo) y una
lista corta de "para reenganchar". Todo sale de agregaciones sobre `tasks`
por `responsable` — el mismo tipo de consulta que ya existe en
`backend/services/marketing.py:calendario()`, pero agrupando por persona en
vez de por fecha. Encaja bien como una sección más de `WeekPanel.tsx` (el
Home actual) o como pestaña nueva.

Mockup: sección "03" del HTML adjunto.

## Cambios rápidos (sueltos, sin rediseño)

- Botón "Copiar todos los emails" en el directorio.
- Acciones rápidas (WhatsApp, Asignar tarea) directamente en la fila, sin
  entrar a la ficha.
- Que cada quien edite sus propias etiquetas desde su ficha, sin pasar por
  quien administre.
- Ordenar el directorio por carga ("más libres primero").

## Por dónde empezaría

1. Carga de trabajo en el directorio — ya está casi todo el dato.
2. Ficha de miembro con historial y nota privada.
3. Etiquetas de habilidad.
4. Salud del equipo / reenganche — necesita que la ficha ya exista para
   tener algo que enseñar.

## Mockups

Abre [`docs/mockups/crm-miembros.html`](mockups/crm-miembros.html) en el
navegador — es una página estática, sin build, con los tres mockups a color
y tipografía real (mismos tokens de `tokens.css`).
