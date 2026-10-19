# Cómo funciona /equipo (guía para el bot)

`/equipo` es el espacio de trabajo interno de TelecoEmprende, en
telecoemprende.es/equipo. Se entra con email y contraseña.

- **Cuenta nueva**: en la pantalla de entrada, «Crear cuenta». La cuenta no
  funciona hasta que un admin la activa desde *Cuentas del equipo*.
- **Contraseña olvidada**: «¿Olvidaste tu contraseña?» manda un enlace de un
  solo uso al correo (vale 1 hora). Un admin también puede poner una
  provisional, y entonces pide cambiarla al entrar.
- **Mis datos**: cada persona corrige su nombre, apellidos, DNI, LinkedIn, foto
  y contraseña en *Mis datos*, abriendo su propia ficha en *Miembros*. El DNI
  solo lo ven su dueño y los admins.

## Departamentos

Todo el mundo es de los tres departamentos: **Marketing**, **Eventos** e
**Ingeniería**. Cada persona tiene un orden de preferencia (1ª, 2ª, 3ª): no
limita lo que ve, solo sirve para proponer a quién asignar una tarea. Arriba de
algunas pantallas hay casillas para ver un departamento, dos o los tres.

El **cargo** (presidente, vicepresidente, boardmember) y ser **VP** de un
departamento permiten repartir tareas a otras personas. **Admin** es aparte:
lo marca otro admin en *Cuentas del equipo*.

## El menú

- **Inicio**: la semana de un vistazo (tus tareas, próximos eventos, lo
  pendiente en notas). **Mesa del club**: lo que se mira en la reunión semanal.
  **Notas**: páginas tipo Notion.
- **Trabajo**: Tareas, Proyectos y Calendario.
- **Club**: Miembros, Reuniones, Herramientas y Papelera.
- **Admin** (solo cargo, VP o admin, según el caso): Métricas, Presupuesto,
  Inscripciones, Cuentas del equipo, Calendario del club y Auditoría.

## Proyectos

Un **proyecto** agrupa todo lo necesario para sacar adelante una idea, un
evento o una mejora. Es de un departamento, de varios o de todo el club, tiene
un **estado** (idea, activo, pausado, cerrado) y un **responsable**.

Dentro de un proyecto hay **entregables** (cada cosa que sale: un cartel, un
reel, una web, el stand de una feria) y cada entregable tiene sus **tareas**.
Un entregable pasa por sus propios estados (idea → generado → en diseño → en
revisión → programado → publicado) y puede tener fecha. Cualquiera crea y edita
proyectos. Un proyecto también enseña las notas enlazadas a él.

## Tareas

Una **tarea** es un encargo con responsables y, si se quiere, fecha límite.
Estados: pendiente → en progreso → por revisar → acabado. En *Tareas* se ven
como un tablero y se arrastran de columna. Cualquiera crea tareas, sin dueño o
para sí; asignarlas a otras personas es de board y VPs. Al asignar, el
formulario propone a quien tiene ese departamento antes en su preferencia y
menos tareas abiertas.

## Mesa del club

Para la reunión semanal: los proyectos vivos con su responsable, su siguiente
paso, su progreso y sus fases (las que tienen fecha pasada y tareas sin acabar
salen como «vencidas»), lo que tiene cada persona (*Por persona*), las tareas
sin dueño («Me la quedo» para cogerla) y las atrasadas.

## Reuniones

Cada reunión tiene fecha, hora, objetivo, convocados y un **acta** que se
escribe como una nota (nace con una plantilla: orden del día, acuerdos,
tareas). Puede ser de un departamento, de **todo el club** o de la
**directiva**. Las de la directiva las convoca y edita la directiva (cargo, VP
o admin) y, por defecto, solo las ve ella; quien la convoca puede abrirla a
todo el club.

Los acuerdos del acta (las casillas sin marcar) se pueden pasar a **tareas de
verdad**, con responsable y fecha, desde la propia reunión: así no se quedan
en el acta.

## Calendario

Uno para todo el club: tareas con fecha, entregables, reuniones, eventos del
club y los de Luma, con capas que se encienden y apagan y «solo lo mío».

## Herramientas, Notas y Papelera

- **Herramientas**: los enlaces del club (Slack, el Drive compartido, Luma, la
  web y los servicios que Ingeniería marca para todos).
- **Notas**: de todo el club, de un departamento o privadas. Las casillas sin
  marcar de una nota salen en el Inicio como pendientes.
- **Papelera**: lo que se borra de proyectos, entregables, tareas, notas y
  reuniones se queda 30 días y cualquiera puede restaurarlo.

## Avisos en Slack

El canal del club recibe: tareas creadas, cambios de estado y comentarios;
cada mañana, lo que vence al día siguiente y las reuniones de mañana; las
reuniones al convocarlas con fecha; y los lunes, el resumen de la Mesa. Quien
tiene algo que ver (responsable, convocado) sale mencionado si su correo de
Slack es el mismo que el de /equipo. Las reuniones privadas de la directiva no
se anuncian.

## Lo que este bot NO sabe hacer

No puede crear ni modificar nada por ti: solo explica cómo funciona la
herramienta. Para hacer un cambio, hay que entrar en telecoemprende.es/equipo.
