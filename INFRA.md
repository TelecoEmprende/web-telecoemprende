# Infraestructura de TelecoEmprende

Este documento describe cómo está montada la infraestructura **independientemente
del frontend actual**. Cuando se sustituya el frontend por el de "una web más
del club" (previsto en unas semanas), toda esta capa se mantiene: backend
Flask, Postgres, Docker/Nginx, despliegue en Vercel + Supabase, dominios y
flujo de ramas. Solo cambia lo que hay dentro de `frontend/`.

## 1. Arquitectura

- **Backend**: Flask (`app.py` + blueprints `backend/api/public.py` y
  `backend/api/admin.py`), lógica de negocio en `backend/services/`.
- **Base de datos**: Postgres, tabla `registrations`. `DATABASE_URL` controla
  la conexión (`backend/config.py`).
- **Frontend**: build estático (Vite) servido por Flask en local/Docker, o
  como servicio aparte en Vercel.
- Dos formas de desplegar el mismo backend, en paralelo:
  1. **Docker Compose** en una VPS propia, con Nginx + Let's Encrypt.
  2. **Vercel + Supabase**, sin servidor propio.

## 2. Despliegue Docker Compose (VPS propia)

`docker-compose.yml` define 4 servicios:

- `db`: Postgres 16, volumen `pgdata`.
- `backend`: Flask servido con Gunicorn (`Dockerfile` raíz), conecta a `db`
  por red interna (`DATABASE_URL=postgresql://...@db:5432/telecoemprende`).
- `frontend`: build de Vite + Nginx (`frontend/Dockerfile`), sirve el estático
  y hace de proxy/TLS termination. Expone 80/443.
- `certbot`: renovación de certificados Let's Encrypt (volumen compartido
  `certbot-webroot` / `certbot-certs` con el servicio `frontend`).

**Arranque de Nginx (`frontend/docker-entrypoint.sh`)**: si ya existe
`/etc/letsencrypt/live/telecoemprende.es/fullchain.pem`, usa
`nginx.conf` (HTTPS completo); si no, usa `nginx-http.conf` (solo HTTP, para
que el reto ACME de certbot pueda completarse la primera vez). Ambos archivos
viven en `frontend/`.

Variables requeridas en un `.env` en la raíz (ver `.env.example`):
`ADMIN_PASSWORD`, `FLASK_SECRET_KEY`, `POSTGRES_PASSWORD`, `CERTBOT_EMAIL`, y
opcionalmente `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME`
(email transaccional al aceptar/rechazar, no bloqueante si se deja vacío).

Comandos: `docker compose up --build -d`, `docker compose logs -f`,
`docker compose down`.

## 3. Despliegue Vercel + Supabase (producción actual)

`vercel.json` define **dos servicios** dentro del mismo proyecto Vercel:

- `backend`: `framework: flask`, `entrypoint: app.py`, con `excludeFiles` para
  no subir `frontend/`, `docker-compose.yml`, `Dockerfile`, `tests/`, `data/`.
- `frontend`: `root: frontend/`, `framework: vite`.

`rewrites` mandan `/api/*` al servicio `backend` y el resto al `frontend`.
Las cabeceras de seguridad (CSP, X-Frame-Options, etc.) están duplicadas aquí
respecto a `app.py` (`after_request`) porque Vercel las aplica a nivel de
plataforma; si se toca una, hay que tocar la otra.

**Base de datos**: Postgres gestionado por **Supabase**, provisionado vía
Vercel Marketplace (`vercel integration add supabase`). Esto inyecta
`POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`, etc. `DATABASE_URL` hay que
fijarla **a mano** igual a la `POSTGRES_URL` pooled, **quitando el parámetro
`&supa=base-pooler.x`** del final (psycopg2 no lo entiende).

**Rutas cliente sin fallback**: el servicio `frontend` sirve estáticos sin
SPA fallback, así que cada ruta top-level de React Router
(`/admin`, `/gracias`, `/charla-santi-y-pablo`, y las que se añadan) necesita
su propio `frontend/<ruta>/index.html` (mismo shell, solo cambia
`<title>`/meta) registrado como entry point extra en
`frontend/vite.config.ts` (`build.rollupOptions.input`). Si se olvida, esa
ruta da 404 en Vercel (en Docker/Nginx no hace falta, `try_files` ya cae a
`index.html`).

Comandos: `vercel env add`, `vercel deploy --prod` (vía `npx vercel@latest`).

## 4. Email transaccional (Resend)

`backend/services/email.py` envía el email de aceptado/rechazado/waitlist vía
la API HTTP de Resend (`https://api.resend.com/emails`, llamada con `urllib`
de la stdlib, sin dependencia nueva). Se activa solo si `RESEND_API_KEY` está
configurada; si no, el envío se salta en silencio y el resto del panel sigue
funcionando igual (ver `backend/config.py`).

**Importante**: clasificar a alguien (botones Aceptar/Rechazar/Waitlist del
panel) **nunca envía el email por sí solo**. Solo queda marcado como
"pendiente de enviar" (`notificado = false` en la tabla `registrations`). El
email de verdad sale al pulsar **"Enviar notificaciones"** en la pestaña de
ese estado, que manda de golpe a todos los pendientes de esa pestaña
(`POST /api/admin/registrations/notificar`). Reclasificar a alguien que ya
había sido notificado lo vuelve a dejar pendiente de un nuevo envío.

### Configurar Resend

1. Crear cuenta en [resend.com](https://resend.com) y verificar el dominio
   remitente (`telecoemprende.es`) en su panel — sin esto, Resend solo deja
   enviar a la propia dirección de la cuenta, no a los alumnos.
2. Generar una API key en Resend.
3. Poner esa key en las variables de entorno:
   - **Docker**: añadir `RESEND_API_KEY` / `RESEND_FROM_EMAIL` /
     `RESEND_FROM_NAME` al `.env` de la VPS y reiniciar (`docker compose up -d`).
   - **Vercel**: `vercel integration add resend/resend-email` (categoría
     `messaging` del Marketplace; se puede listar con
     `vercel integration discover --category messaging`) y luego
     `vercel env pull`, o directamente `vercel env add RESEND_API_KEY` si no
     se quiere pasar por el Marketplace.
4. Sin hacer nada más, ya funciona: `RESEND_FROM_EMAIL` por defecto es
   `inscripciones@telecoemprende.es` (tiene que ser una dirección del dominio
   verificado en el paso 1).

### Personalizar el contenido del email

Los tres textos (aceptado/rechazado/waitlist) están en
`backend/services/email.py`, en los diccionarios `_ASUNTOS` (asunto) y
`_CUERPOS` (cuerpo, HTML simple, `{nombre}` se sustituye por el nombre de
pila). Para cambiar la redacción de cualquiera de los tres, se edita ese
archivo y punto — no hay que tocar nada más, no hay plantillas en base de
datos ni en el panel. Si en el futuro se quiere que alguien no técnico edite
el texto desde el propio panel admin, habría que añadir una pantalla de
"plantillas" con su tabla en Postgres; no existe hoy porque no hacía falta
para el volumen de este club (ver ladder de `ponytail` — YAGNI mientras el
único que toca esto sea quien mantiene el código).

## 5. Dominios

`telecoemprende.es` y `www.telecoemprende.es` están configurados en Vercel
(lista de dominios del proyecto Vercel, no en este repo). Cualquier cambio de
DNS se hace ahí, no en `docker-compose.yml` ni en `vercel.json`.

## 6. Ramas y flujo de despliegue

El repo usa `dev → staging → prod` (no `main`; `main` se renombró a `prod`).
Vive bajo el org de GitHub `TelecoEmprende` (remote `origin` sigue apuntando
al alias personal `Hammad-Bellachhab/web-telecoemprende`, pero GitHub
redirige — para `gh` hay que forzar `--repo TelecoEmprende/web-telecoemprende`
porque la inferencia automática coge el owner viejo).

- Proyecto Vercel: `prj_8ndbL20QB2nuhS6FVexqRvp28zLG` (team
  `team_bdx0ge8kotHnSbhwTVZGWsIU`).
- **Production Branch en Vercel = `prod`**. Un merge a `prod` despliega solo
  con el merge, sin `vercel deploy --prod` manual.
- Flujo normal para publicar un cambio: trabajar en `dev` → PR `dev → staging`
  → merge → PR `staging → prod` → merge.

## 7. Qué sobrevive al cambio de frontend

Al cambiar `frontend/` por la futura web del club, esto se mantiene tal cual:

- Todo el backend (`app.py`, `backend/`), Postgres y su esquema.
- `docker-compose.yml`, `Dockerfile` raíz, `certbot`.
- `vercel.json` (servicio `backend`, rewrites `/api/*`) — el servicio
  `frontend` y sus rutas/entry points sí habrá que rehacerlos para el nuevo
  proyecto Vite/lo que sea.
- Supabase/`DATABASE_URL`, dominios, integración de Resend.
- El flujo de ramas `dev → staging → prod`.

Lo único ligado al frontend actual (y que no sobrevive) son los componentes
React, `frontend/vite.config.ts` (entry points de rutas) y los estilos
`frontend/src/styles/*.css`.
