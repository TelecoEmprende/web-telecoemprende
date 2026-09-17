# Cómo funciona /equipo (guía para el bot)

`/equipo` es el espacio de trabajo interno de TelecoEmprende, en
telecoemprende.es/equipo. Se entra con email y contraseña (los da alguien de
dirección desde `/admin` — no es la misma contraseña del panel `/admin`).
Cada persona ve solo su(s) departamento(s): Marketing, Eventos o
Ingeniería. Quien tiene el departamento Ingeniería, o es presidente/board
member, entra también automáticamente en `/admin`.

## Departamentos

- **Marketing**: campañas y contenido para redes.
- **Eventos**: en la interfaz se llama igual pero "Campañas" se ve como
  "Eventos" y "Tareas" como "Gestiones" — es el mismo sistema con otro
  nombre.
- **Ingeniería**: mantiene la web y las herramientas internas.

## El CRM: Campañas y Contenido

Una **campaña** agrupa el trabajo de una acción de marketing o un evento
concreto (p. ej. "Charla de otoño"). Dentro de una campaña se crean
**contenidos** (piezas de comunicación: un reel, un cartel, un post) que
pasan por sus propios estados: idea → generado → en diseño → en revisión →
programado → publicado. El contenido y las tareas son cosas distintas: un
contenido puede estar "en diseño" aunque la tarea de escribir el guion ya
esté "acabada".

## Tareas

Una **tarea** es un encargo de trabajo con uno o varios responsables y,
opcionalmente, una fecha límite (deadline). Estados: pendiente → en progreso
→ por revisar → acabado. Al crear una tarea se puede elegir el departamento
(por si alguien ve varios) y, si tiene fecha, aparece en el calendario. El
club avisa por Slack cuando se crea una tarea, cuando cambia de estado y
cuando alguien la comenta.

## Calendario y eventos

El calendario es compartido por todo el club (no hay uno distinto por
departamento) y muestra las tareas con fecha de todos los departamentos a la
vez, con filtro para ver "solo lo mío". Al crear una tarea desde el
calendario se puede elegir a qué departamento pertenece. Un elemento del
calendario de otro departamento del que también formas parte se puede abrir
directamente sin cambiar de pestaña.

## Miembros y onboarding

Cada persona tiene una ficha con su carga de trabajo y una checklist de
onboarding. Al completar el último punto de la checklist, el club lo anuncia
en Slack.

## Otras secciones (según departamento)

- **Recursos, Presupuesto, Reuniones, Alumni**: paneles con su propio listado
  editable, cada uno dentro del departamento correspondiente.
- **Anuncios**: visible para todo el club sin importar el departamento.

## Lo que este bot NO sabe hacer

No puede crear ni modificar nada por ti — solo explica cómo funciona la
herramienta. Para hacer un cambio, hay que entrar en telecoemprende.es/equipo.
