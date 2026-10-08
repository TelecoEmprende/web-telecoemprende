# TelecoEmprende

Web de **TelecoEmprende**, el club de emprendimiento nacido en la ETSIT-UPM y abierto a toda la UPM. Backend en Flask, frontend en React + TypeScript + Vite, base de datos PostgreSQL.

**Producción:** [telecoemprende.es](https://telecoemprende.es) (Vercel + Supabase).

## Qué hay

- `/`: la home del club, `/news` (noticias diarias para emprender) y `/privacidad`.
- `/equipo`: espacio de trabajo interno del club. Ingeniería y el board ven además el grupo Admin (inscripciones, cuentas, calendario del club).
- `/demo` y `/juego`: proyectos independientes en `demo/` y `juego/` (ver `juego/README.md`).

La arquitectura y las convenciones están en `CLAUDE.md`.

## Desarrollo local

```bash
cp .env.example .env               # rellena FLASK_SECRET_KEY como mínimo
pip install -r requirements.txt
python app.py                      # backend en :5000

cd frontend && npm install && npm run dev   # http://localhost:5173, proxy de /api al backend
```

## Tests

```bash
python -m unittest discover -s tests -v   # backend
cd frontend && npm test                   # frontend
```

## Despliegue

- **Vercel + Supabase (producción):** `vercel.json` define los servicios `backend`, `frontend`, `demo` y `juego`. `DATABASE_URL` es la `POSTGRES_URL` de Supabase **sin** el parámetro `&supa=base-pooler.x` (psycopg2 no lo acepta). Despliegue: `npx vercel@latest deploy --prod`.
- **Docker Compose (alternativa):** `docker compose up --build -d` levanta Postgres, Flask (Gunicorn), Nginx y Certbot. Necesita en `.env` `FLASK_SECRET_KEY`, `POSTGRES_PASSWORD` y `CERTBOT_EMAIL`.
