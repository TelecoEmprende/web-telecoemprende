# Auditoría de noviembre de 2026

Revisión completa del repo (backend, base de datos, frontend, despliegue y
tests) hecha el 2026-11-13. Aquí queda qué se encontró, qué se arregló, qué
riesgos se aceptan y qué sigue pendiente. Cómo funciona ahora cada pieza está
en `docs/arquitectura.md`; esto es el registro.

## Diagnóstico de partida

Código legible y bien comentado, SQL parametrizado, RLS en Supabase, papelera,
auditoría y recuperación de contraseña bien resueltas. Los fallos estaban en
lo operativo: no se podía quitar el acceso a nadie, las tareas programadas de
producción nunca se ejecutaban, varias defensas solo funcionaban con una sola
instancia (Vercel tiene varias) y no había CI.

## Arreglado

| # | Gravedad | Problema | Arreglo |
|---|---|---|---|
| C1 | Crítico | Los permisos vivían en la cookie: desactivar, borrar o quitar el admin a una cuenta no cortaba su sesión abierta (que además se renovaba sola con el uso). Una cookie con `admin_auth` y sin cuenta daba admin. | `refrescar_sesion` relee la cuenta en cada petición a `/api`; la sesión guarda `member_id`. Tests en `tests/test_api.py` (`test_desactivar_la_cuenta_corta_la_sesion_abierta` y siguientes). |
| C2 | Crítico | `backend/api/cron.py` solo aceptaba POST y Vercel Cron llama con GET: cada ejecución era un 405. Ni avisos de Slack, ni papelera de 30 días, ni purga de auditoría e inscripciones (plazo de conservación de datos personales). | Las rutas aceptan GET y POST; los tests llaman con GET (`test_vercel_cron_llama_con_get`). |
| T3 | Alto | Sin `FLASK_SECRET_KEY`, cada instancia generaba su propia clave y las sesiones se cerraban al azar. | En Vercel la app no arranca sin ella; en local sigue la temporal. |
| A4 | Alto | No había CI: los tests del backend solo corrían si alguien tenía Docker arrancado. | `.github/workflows/ci.yml` en cada PR a `staging` y `prod`. |
| A1 | Alto | El límite de intentos de login era un `dict` en memoria por instancia: apenas frenaba nada en Vercel y no se vaciaba nunca. | Tabla `login_attempts` (migración `0016`), purgada por el cron diario. |
| T1 | Alto | `limpiar_texto` escapaba HTML al guardar: «O'Brien» salía como `O&#x27;Brien` en el CRM, la web y los Excel. | Ya no escapa (absorbe la limpieza que hacía `_sanear` en `api/marketing.py`); la migración `0017` devuelve lo guardado a su texto real. |
| T2 | Medio | Los enlaces de tareas y entregables no pasaban por `_url` y se pintan en un `<a href>`. | `_lista_urls`: solo http(s); sin esquema se completa con `https://`. La `0017` limpia los guardados. |
| A2 | Alto | Cada función abría su propia conexión a Postgres (hasta cinco saludos TLS por petición) y sin `connect_timeout`. | `conexion()` en `services/db.py`: una por petición, con timeout de 5 s. |
| A3 | Medio | Las migraciones solo se aplicaban en la primera petición: un fallo salía como 500 en producción. | `migraciones.yml` las aplica al fusionar en `prod` (`python -m backend.services.db`). **Necesita el secreto `DATABASE_URL` en GitHub**; sin él se salta con un aviso. |
| T6 | Medio | El CLI `shadcn` estaba en `dependencies` y arrastraba 18 vulnerabilidades (1 crítica); `vitest@2` iba con `vite@7`. | `shadcn` a `devDependencies`, `npm audit fix` y `vitest@5`. `npm audit --omit=dev`: 0. Quedan 12 moderadas/bajas solo de desarrollo. |
| T4 | Medio | El calendario del club aceptaba `2026-02-31` y la base de datos devolvía un 500. | `date.fromisoformat` en `_validar_evento_calendario`. |
| T5 | Medio | Una reunión de Directiva borrada salía en la papelera de todos, pero solo la directiva podía restaurarla. | La papelera enseña solo lo que cada cual puede restaurar. |
| A6 | Medio | El despliegue con Docker se había quedado atrás (la CSP de nginx rompía `/news`). | Borrado: producción es solo Vercel. Fuera `gunicorn` de `requirements.txt`. |
| — | Bajo | Documentación que contradecía al código (README y `services/admin.py` decían que el admin era de Ingeniería y el board; `api/marketing.py`, que `@requiere_sesion` exigía el departamento; la página de acceso denegado enlazaba a `/admin` y llevaba colores hex). | Corregido. |

## Antes de fusionar en `prod` (por hacer)

Lo tiene que hacer quien tenga acceso al proyecto de Vercel y al repositorio
de GitHub. Los pasos 1 y 2 van antes de fusionar.

1. **`FLASK_SECRET_KEY` en Vercel** (Production y Preview). Si ya existe, no
   se cambia: cambiarla cierra todas las sesiones. Si no existe:
   `python -c "import secrets; print(secrets.token_hex(32))"` y
   `vercel env add FLASK_SECRET_KEY`. Sin ella el backend ya no arranca.
2. **`CRON_SECRET` en Vercel** (Production). Sin él, los crons responden 401
   aunque ya acepten GET.
3. **Opcional: secreto `DATABASE_URL` en GitHub** (Settings → Secrets and
   variables → Actions), el mismo valor que en Vercel. Sin él,
   `migraciones.yml` se salta y las migraciones se aplican en la primera
   petición a `/api`, como antes. Si se saca con `vercel env pull .env.vercel`,
   borrar `.env.vercel` después.
4. PR `dev` → `staging` y `staging` → `prod`, con CI en verde y
   `gh pr merge <n> --merge`.

Qué pasa al desplegar:

- Se aplican `0016` (tabla `login_attempts`) y `0017` (textos sin escapar,
  enlaces limpios).
- Las sesiones abiertas antes de esto se migran solas por email; las de
  cuentas desactivadas o borradas se cierran.
- El primer cron diario vacía lo que lleve más de 30 días en la Papelera y
  purga la auditoría y las inscripciones de más de un año. Hasta ahora no se
  había ejecutado nunca, así que puede borrar bastante de golpe.
- El lunes siguiente llega a Slack el primer resumen de la Mesa.

Después: en Vercel → Settings → Cron Jobs, comprobar que la siguiente
ejecución sale en 200, y entrar en `/equipo` con una cuenta normal y una de
admin.

## Prueba del CRM contra el backend real (2026-11-14)

Se recorrieron los casos de `docs/equipo.md` con el backend y una base de
datos local, con cuatro cuentas (admin, VP de Eventos, miembro sin cargo y
presidente), en escritorio y a 390 px. Pasan todos: Inicio, Mesa (quedarse
una tarea, fase vencida), Notas (autoguardado, ámbito privado, búsqueda,
papelera), Tareas (permisos de reparto, arrastrar y deshacer, editar una de
otro departamento, administrativas), Proyectos (todo el ciclo, enlace
compartido con otro departamento marcado, restaurar con hijos), Calendario,
Miembros, Reuniones (acta pegada, acuerdo a tarea, Directiva cerrada y en
solo lectura) y Papelera. Lo que falló y se arregló entonces:

- Desactivar o quitar el admin a una cuenta cortaba los datos al momento,
  pero la interfaz no se enteraba: la persona seguía dentro viendo «No
  autorizado.» y el grupo Admin no desaparecía (y al dárselo no aparecía hasta
  recargar). Ahora cada respuesta de `/api` lleva `X-Equipo-Admin`, y con un
  401 o un cambio en ese valor `EquipoPage` vuelve a pedir la sesión
  (`REVISAR_SESION` en `api/client.ts`).
- La Mesa (y su resumen de Slack) listaba como «sin dueño» y «atrasadas» las
  tareas de proyectos archivados o cerrados, que ya no salían en la propia
  Mesa. Ahora siguen la misma regla que los proyectos.
- Al pasar un acuerdo a tarea, a quien no es board ni VP se le proponía
  asignarla a otra persona y fallaba al guardar. Ahora ve «Me la quedo yo»,
  como en Tareas (`puedeAsignarEn` en `types/equipo.ts`, compartido).
- El LinkedIn exigía escribir `https://` y los enlaces de tareas no: ahora se
  completa igual (`_linkedin` en `api/marketing.py`). El Excel y el PDF de
  cuentas ponen «Ingeniería», no `ingenieria`.
- `interactive-widget=resizes-content` en el `viewport` de `/equipo`, para que
  en Android el teclado no tape el editor de Notas y actas.

Segunda pasada en móvil, con un iPhone emulado (WebKit, táctil, 393 px) y
tocando de verdad: calendario (tocar un día y abrir lo suyo), tarea (cambiar
estado y guardar), selector de personas, reunión (escribir en el acta, pasar
un acuerdo), proyecto (tarea rápida, entregable), ficha, notas y los seis
apartados de Admin. Se arregló:

- Safari hacía zoom al tocar los buscadores, los desplegables y los campos de
  Cuentas (13–14 px). Con puntero táctil, todos los campos van a 16 px (regla
  al final de `equipo.css`).
- El editor de entregables quedaba por debajo de la barra de arriba (que
  tapaba el principio del formulario): ahora va en un portal.
- En el selector de personas, «sobrecargado · 3 abiertas» dejaba el nombre en
  una letra.
- «+ Entregable» creaba ya un «Entregable sin título» y, al cancelar, se
  quedaba en el proyecto. Ahora se crea al guardar.

Lo que no se puede probar en local: un teléfono de verdad (teclado, barra de
Safari), el correo, Slack y los datos reales de producción.
- A 390 px, las cuatro casillas de Tareas (con Administrativo) hacían deslizar
  la página de lado.
- Textos: «Archivada» en un proyecto, «sus 1 entregables», la Papelera no
  nombraba reuniones ni entregables, y con un departamento desmarcado
  Proyectos decía «Aún no hay proyectos» aunque los hubiera.

## Riesgos aceptados

- **`/demo`, `/juego` y `/equipo` comparten origen** (A5). El JavaScript de
  `demo/` o `juego/` puede llamar a `/api` con la sesión de quien lo abra. No
  se pasan a subdominios; a cambio, `juego/` no lleva dependencias de terceros
  y cada dependencia nueva de `demo/` se revisa como si fuera del CRM. Si
  alguno crece o recibe contenido de fuera, se mueve a su subdominio.

## Pendiente (no entraba en el plan)

- Probar en un teléfono de verdad (iPhone y Android) escribir en Notas y en
  un acta con el teclado abierto: `interactive-widget` solo se ha comprobado
  en que BlockNote deja de avisar, e iOS ignora esa opción.
- Un admin puede borrar su propia cuenta o la del último admin (solo está
  bloqueado quitarse el admin a uno mismo).
- Las fechas por defecto del calendario usan `date.today()` en UTC, no en hora
  de Madrid; el calendario cruzado no limita el rango pedido.
- Bot de Slack: el conjunto de eventos ya procesados crece sin límite, llama
  al LLM dentro de los 3 s que da Slack para contestar y el modelo
  (`gemini-3.8-flash`) está escrito a mano.
- No hay `logging.basicConfig`: puede que los `logger.info` no lleguen a los
  logs de Vercel (sin comprobar).
- Tres vocabularios para lo mismo (`campaigns/contents` en la API,
  `projects/deliverables` en la base, «proyectos/entregables» en la interfaz;
  `marketing_api` sirve a los tres departamentos) y archivos muy grandes
  (`services/marketing.py`, `equipo.css`, `marketing.css`). Partirlos cuando
  se toquen, no antes.
- Las fotos van en base64 dentro de `members.photo`: el Excel de cuentas las
  carga todas, y con mucha gente rozará el límite de 4,5 MB por respuesta de
  Vercel.
