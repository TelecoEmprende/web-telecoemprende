# /equipo — qué tiene que hacer cada apartado

Especificación de producto del CRM del club. No describe cómo está construido
(eso es `CLAUDE.md`), sino **cómo tiene que comportarse**: para qué sirve cada
apartado, quién puede hacer qué y qué casos tienen que funcionar siempre.

Cualquier cambio en `/equipo` parte de aquí: si el cambio contradice algo de
este documento, primero se cambia el documento (y se decide), luego el código.
Un apartado no está terminado hasta que sus **casos que tienen que funcionar**
se han probado contra el backend real (no solo con tests que simulan la API),
en escritorio y a ancho de móvil.

Lo marcado **Por decidir** no tiene todavía una respuesta acordada.

## Cómo se usa (oct 2026)

- Lo usa casi todo el club, a diario, mitad desde el móvil y mitad desde el
  ordenador: todo tiene que funcionar igual de bien a 390 px.
- Lo que tiene que resolver: saber quién hace qué, que lo acordado avance, no
  perder fechas y no tener la información dispersa.
- Ningún apartado sobra. La prioridad es que **lo que hay funcione**, antes que
  añadir nada.

## Reglas que valen para todo

1. **Todos son de los tres departamentos.** El orden de preferencia (1ª, 2ª,
   3ª) solo sirve para proponer a quién asignar y para las métricas.
2. **Permisos: cualquiera edita todo, salvo repartir.** Cualquiera crea, edita,
   borra y restaura proyectos, entregables, tareas, notas y reuniones, sean de
   su departamento o de otro. Asignar una tarea a **otra persona** es solo de
   cargo (board) y VPs; los demás pueden dejarla sin dueño o quedársela.
   Excepciones: las reuniones de Directiva (ver Reuniones), las notas privadas
   (solo su autor) y lo de Admin.
3. **Las casillas de departamento de arriba solo filtran lo que se ve.** Nunca
   deciden si algo se puede editar, guardar o borrar, ni por dónde se guarda:
   cada cosa se guarda por la ruta de **su** departamento. Editar algo de
   Eventos con solo Ingeniería marcada tiene que funcionar.
4. **Si algo falla al guardar:** aviso claro de qué ha pasado y lo escrito no
   se pierde, para poder reintentar.
5. **Borrar no es definitivo:** va a la Papelera 30 días; cualquiera restaura;
   solo un admin borra para siempre.
6. **Mismo aspecto en todos los apartados:** título en la barra de arriba;
   debajo, una frase que explica el apartado y la acción principal a la
   derecha; luego filtros y buscador; luego el contenido. Mismo hueco entre
   piezas, mismos botones, mismo buscador, mismos vacíos y cargas.

## Avisos

- **Canal de Slack del club** (como ahora): tareas creadas, cambios de estado,
  comentarios, lo que vence mañana, reuniones convocadas y las de mañana, y el
  resumen de la Mesa los lunes. El volumen actual está bien.
- Quien tiene que ver con un aviso (responsable, convocado) sale **mencionado**.
- **Por decidir:** mensaje privado de Slack a cada persona con solo lo suyo (te
  asignan algo, te vence algo, te convocan), además del canal.

---

## Inicio

**Para qué:** lo primero que se ve al entrar, cada día.
**Qué enseña:** lo mío (tareas de la semana, lo atrasado) y lo del club
(próximos eventos, pendientes de notas), como ahora.
**Casos que tienen que funcionar:**
- Una tarea asignada a mí con fecha esta semana sale en «Mis tareas de la semana».
- «Nueva tarea», «Nueva nota» y «Buscar miembro» llevan a su apartado.

## Mesa del club

**Para qué:** la reunión semanal; ver de un vistazo qué está vivo y qué falla.
**Qué enseña:** proyectos vivos (responsable, siguiente paso, progreso, fases
con las vencidas marcadas), lo de cada persona, tareas sin dueño, atrasadas y
lo último que se ha movido. La fecha de una fase es opcional y sin fecha no se
avisa de nada.
**Casos:**
- «Me la quedo» en una tarea sin dueño me la asigna y desaparece de la lista.
- Una fase con fecha pasada y tareas sin acabar sale como vencida.

## Notas

**Para qué:** páginas libres (wikis, listas, contactos mientras no haya
Contactos). De todo el club, de un departamento o privadas.
**Reglas:** una nota privada solo la ve y la toca su autor; las casillas sin
marcar salen en el Inicio como pendientes.
**Casos:** crear, escribir (se guarda sola), cambiar de ámbito, buscar, borrar
y restaurar.

## Tareas

**Para qué:** quién hace qué y en qué estado está.
**Una tarea lleva:** título e instrucciones (obligatorios); responsables, fecha,
proyecto y entregable (opcionales). Estados: pendiente → en progreso → por
revisar → acabado (los cuatro se usan).
**Tablero:** el de un departamento o **Administrativo**, para lo que no es de
ninguno (mandar un correo, pagar algo, papeleo). Una administrativa sale en
los tres tableros, una sola vez, y no cuelga de ningún proyecto. La reparte el
board o cualquier VP.
**Casos:**
- Crear una tarea sin dueño o para mí (cualquiera); para otra persona (solo
  board y VPs; a los demás les sale un aviso claro).
- Arrastrar de columna cambia el estado y se puede deshacer.
- Abrir y editar una tarea de cualquier departamento, con cualquier
  combinación de casillas marcada.
- Crear una administrativa; sale una vez con los tres marcados; pasarla a un
  departamento y volver.

## Proyectos

**Para qué:** sacar adelante una idea, un evento o una mejora.
**Estructura (se queda así):** proyecto → entregables → tareas. Un proyecto es
de uno, varios o los tres departamentos; tiene estado (idea, activo, pausado,
cerrado) y responsable.
**Casos:**
- Crear, editar, archivar, duplicar y borrar/restaurar un proyecto.
- Dentro: crear, editar y borrar entregables; añadir tareas rápidas a un
  entregable y marcarlas.
- Todo lo anterior en un proyecto que **no** es del primer departamento marcado, con tareas de otro departamento dentro y abierto desde un enlace compartido.

## Calendario

**Para qué:** las fechas de todo en un sitio.
**Qué enseña:** tareas con fecha, entregables, reuniones, eventos del club y
los de Luma (red alumni; se quedan como están), con capas y «solo lo mío».
**Casos:** abrir un elemento de otro departamento abre lo suyo; crear desde el
calendario.

## Miembros

**Para qué:** quién es quién y cuánto lleva cada uno.
**Casos:** buscar por nombre o habilidad, filtrar por preferencia y carga;
abrir mi ficha y editar «Mis datos».
**Por decidir:** qué necesita alguien nuevo (le falta saber qué hacer primero y
quién es quién): ¿una lista de primeros pasos?, ¿«quién lleva qué» en su ficha?

## Reuniones

**Para qué:** convocar, dejar escrito lo acordado y que lo acordado avance.
**Cómo es de verdad:** la reunión se transcribe en Notion y después se **pega
el acta** en el CRM (se conservan títulos, listas y casillas). Las casillas
sin marcar del acta son los acuerdos y se pasan a tareas con responsable,
fecha y departamento.
**Ámbitos:** un departamento, todo el club o **Directiva**. Las de Directiva
las convoca y edita la directiva (cargo, VP o admin); por defecto solo las ve
ella, y se pueden abrir a todo el club (entonces el resto las lee pero no las
edita).
**Casos:**
- Crear, editar (título, fecha, hora, convocados, objetivo, acta) y borrar una
  reunión **ya creada** de cualquier departamento, con cualquier casilla
  marcada.
- Pegar un acta de Notion y que salgan sus acuerdos.
- Pasar un acuerdo a tarea: antes de crearla se edita título, instrucciones,
  para quién, fecha y tablero (por defecto el de la reunión, o Administrativo
  si es de todo el club o de la directiva); queda marcado en el acta.

## Herramientas

**Para qué:** los enlaces del club (Slack, Drive, Luma, web, GitHub y los
servicios que Ingeniería abre a todos). A Ingeniería también le enseña el
estado de la plataforma y los servicios.

## Papelera

**Para qué:** recuperar lo borrado en 30 días.
**Casos:** restaurar un proyecto devuelve sus entregables y tareas; no se
restaura algo dentro de un proyecto que sigue borrado.

## Admin

Métricas y Presupuesto de Eventos (cargo, VP o admin); Inscripciones, Cuentas del equipo,
Calendario del club y Auditoría (admin).

## Pendiente de decidir (fuera de la prioridad actual)

- **Contactos** (empresas, ponentes, sponsors): lo mira Hammad.
- Mensajes privados de Slack por persona.
- Primeros pasos para gente nueva.
