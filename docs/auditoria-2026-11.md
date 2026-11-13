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

## Riesgos aceptados

- **`/demo`, `/juego` y `/equipo` comparten origen** (A5). El JavaScript de
  `demo/` o `juego/` puede llamar a `/api` con la sesión de quien lo abra. No
  se pasan a subdominios; a cambio, `juego/` no lleva dependencias de terceros
  y cada dependencia nueva de `demo/` se revisa como si fuera del CRM. Si
  alguno crece o recibe contenido de fuera, se mueve a su subdominio.

## Pendiente (no entraba en el plan)

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
