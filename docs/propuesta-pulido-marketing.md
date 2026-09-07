# Propuesta: pulido de lo que ya existe en Marketing

Escrito por Abril (con Claude) el 7 de septiembre de 2026. Como
[`propuesta-crm-miembros.md`](propuesta-crm-miembros.md): **nada de esto está
construido**, es una lista para decidir qué se hace y quién. Sin mockups
esta vez — son retoques sobre pantallas que ya existen, no pantallas nuevas.

## Tareas / tablero

**Buscador por texto.** Con 30-40 tareas, "Solo lo mío" (`TasksPanel.tsx`)
no basta para encontrar una en concreto. Un `<input>` que filtre `tasks` por
`titulo` en cliente, igual de barato que el filtro de "Solo lo mío" que ya
existe al lado.

**Orden dentro de columna.** Hoy `TasksPanel.tsx` pinta cada columna en el
orden en que llegan de `getTasks()` (orden de creación). Ordenar por
`prioridad` o por `deadline` dentro de cada columna ayuda a ver lo urgente
primero sin abrir cada tarjeta. Un `<select>` de orden en la cabecera del
tablero, o directamente ordenar siempre por deadline ascendente.

**Deshacer tras arrastrar.** Un drag accidental a otra columna
(`moverA` en `TasksPanel.tsx`) hoy no tiene vuelta atrás rápida. Un toast
"Movida a Acabado · Deshacer" unos segundos después del `updateTask`
optimista es barato de añadir (ya hay `AlertBanner` como patrón de aviso en
pantalla) y evita sustos.

## Campañas

**Vincular Content ↔ Task de verdad.** Hoy `contents` y `tasks` son
independientes (`backend/services/marketing.py`): publicar un contenido no
cierra sus tareas solas, ni al revés. Aunque sea un checkbox "marcar tareas
relacionadas como hechas" al cambiar un content a `publicado`.

**Duplicar campaña.** Para lo que se repite (reunión semanal, story de
bienvenida): copiar `campaign` + sus `contents`/`tasks` en dos clics en vez
de rehacerla a mano. Backend: una función `duplicar_campaign(id)` que hace
lo mismo que `crear_campaign` pero copiando los hijos.

**Enlace compartible por campaña.** Ya apuntado como pendiente en sesiones
anteriores: una URL tipo `/equipo?campaign=<id>` que abra directo esa
campaña, para pegar en el WhatsApp del equipo en vez de explicar "entra a
Marketing y busca X".

## Calendario

**Vista semana**, no solo mes (`CalendarPanel.tsx`). En móvil, un mes entero
es difícil de tocar con precisión; una semana cabe mejor en pantalla
pequeña. El backend ya soporta cualquier rango (`api_calendario` acepta
`desde`/`hasta` libres), es trabajo de frontend.

**Aviso el día antes de un deadline.** Hay Resend ya configurado para otros
correos (pendiente verificar el dominio, según el log de Hammad de
6 de septiembre) — reusarlo para un cron/aviso diario de "tienes una tarea
que vence mañana" es poco esfuerzo añadido sobre esa base.

## Pulido general

**"Cargando..." → esqueletos.** Casi todos los paneles (`TasksPanel`,
`CampaignsPanel`, `CalendarPanel`...) muestran solo el texto "Cargando...".
Un rectángulo gris con la forma de la tarjeta/fila se percibe más rápido,
sobre todo en móvil con peor conexión.

**Contador de caracteres cerca del límite.** Los campos de texto ya validan
contra `MAX_TITULO_LEN`/`MAX_TEXTO_LARGO_LEN` (`backend/config.py`) pero solo
avisan al fallar el guardado. Un contador tipo "180/300" que aparezca cerca
del límite evita la sorpresa.

## Por dónde empezaría

Buscador y orden en tareas son los más baratos y los que más se notan en el
uso diario. El resto son mejoras reales pero de segunda ronda.
