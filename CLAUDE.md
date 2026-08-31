# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Registration ("inscripción") site for **TelecoEmprende**, the entrepreneurship club born at ETSIT-UPM and now open to the whole UPM. Flask backend + PostgreSQL, React/TypeScript/Vite frontend, served together behind Nginx via Docker Compose. Copy and UI are in Spanish.

## Commands

### Frontend (`frontend/`)

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173, proxies /api to http://127.0.0.1:5000
npm run build     # tsc -b && vite build -> frontend/dist
npm test          # vitest run
npx vitest run <path/to/file.test.tsx>   # single test file
npx tsc --noEmit -p .                    # type-check only
```

### Backend (root)

```bash
pip install -r requirements.txt
python app.py                              # runs on :5000, debug=True
python -m unittest discover -s tests -v    # all backend tests
python -m unittest tests.test_api.<TestClass>.<test_method>   # single test
```

### Docker (full stack)

```bash
docker compose up --build -d
docker compose logs -f
docker compose down
```

Requires a root `.env` with `ADMIN_PASSWORD`, `FLASK_SECRET_KEY`, `POSTGRES_PASSWORD`, `CERTBOT_EMAIL` (see `.env.example`).

### Vercel + Supabase (alternate production deploy)

The repo also deploys to Vercel via `vercel.json`, which defines two **services**: `backend` (this Flask app, `framework: flask`, `entrypoint: app.py`) and `frontend` (the Vite build, `root: frontend/`). Rewrites send `/api/*` to the backend and everything else to the frontend. Postgres is Supabase, provisioned through the Vercel Marketplace integration (`vercel integration add supabase`), which injects `POSTGRES_URL`/`POSTGRES_URL_NON_POOLING` etc. — `DATABASE_URL` must be set manually to the pooled `POSTGRES_URL` **with the trailing `&supa=base-pooler.x` query param stripped**, since `psycopg2` rejects that vendor-specific param. Use `vercel env add` / `vercel deploy --prod` (via `npx vercel@latest`, no global install needed).

Because the frontend service serves static files with no built-in SPA fallback, the client-only routes (`/admin`, `/gracias`, `/charla-santi-y-pablo`) each have their own `frontend/<route>/index.html` (identical shell, just different `<title>`/meta tags) wired up as extra Rollup entry points in `frontend/vite.config.ts`'s `build.rollupOptions.input`. Adding a new top-level route in `App.tsx` requires adding a matching `frontend/<route>/index.html` + input entry, or it will 404 on Vercel (Docker/nginx does not need this — nginx already does `try_files ... /index.html`).

## Architecture

- **`app.py`** is the Flask entrypoint. It registers the `public_api` and `admin_api` blueprints, applies security headers (CSP, X-Frame-Options, etc.) in `after_request`, and also serves the built frontend (`frontend/dist`) directly — `/`, `/admin`, `/assets/<file>`, `/logo.png` all read from the Vite build output. There is no separate static file server in dev; in prod Nginx sits in front (see `docker-compose.yml` / `frontend/` Dockerfile).
- **`backend/api/public.py`** and **`backend/api/admin.py`** are the two Flask blueprints. Business logic is not inline in the routes — it lives in **`backend/services/`**:
  - `services/registrations.py` — CRUD for registrations, Excel export (`openpyxl`) generated in memory on demand (`generar_excel_en_memoria`) for the admin download — nothing is read from or written to disk at request time. `EXCEL_FILE` in `backend/config.py` is unused leftover from the pre-Postgres era.
  - `services/security.py` — honeypot + rate limiting (`MAX_REQUESTS_PER_MINUTE` / `BLOCK_WINDOW_SECONDS` in `backend/config.py`), input sanitization against SQL injection/XSS.
  - `services/admin.py` — session-cookie based admin auth (`ADMIN_PASSWORD` env var, no user table).
  - `backend/schemas.py` — request/response validation shapes shared by both blueprints.
  - `backend/config.py` — all env-driven constants (DB URL, field length limits, UPM email domain allowlist, rate-limit knobs).
- Registrations are stored in Postgres (table `registrations`); `DATABASE_URL` defaults to a local dev Postgres in `config.py`.
- **Frontend routing** (`frontend/src/App.tsx`) is a flat `react-router-dom` route table: `/` (`HomePage`), `/charla-santi-y-pablo` (`EventoSantiPabloPage`, a standalone past-event landing page with its own `Footer`), `/gracias` (`ThankYouPage`), `/admin` (`AdminPage`).
- **`HomePage`** composes the landing page from `components/home/*` sections in order (Hero, About/team, Departments, Events, Requirements, RegistrationForm) plus `LandingFooter`. Styling is plain CSS in `frontend/src/styles/*.css` (`landing.css` for the public site, `admin.css` for the admin panel, `tokens.css` for shared CSS variables) — no CSS framework/modules, classes are hand-authored (`lp-*` prefix for landing sections, `*-react` suffix in the registration form/admin areas).
- **Registration form** (`components/home/RegistrationForm.tsx`) drives programa selection off `frontend/src/data/upmSchools.ts` (`UPM_SCHOOLS`): pick an Escuela first, which filters the Grado/Máster `<select>` to that school's `grados`/`masters`. The submitted `estudios` string is built client-side as `Grado - <nombre completo>` or the master's full name (see `buildEstudios`) — the backend just receives free text, it has no knowledge of the school/program catalog. Client validation lives in `utils/validation.ts` (`UPM_EMAIL_PATTERN` requires `@alumnos.upm.es` or `@upm.es`, Drive-link pattern, required fields); the same constraints are re-enforced server-side via `backend/config.py`/`schemas.py`.
- **Admin panel** (`routes/AdminPage.tsx`, `components/admin/*`) is a password-gated table (`RecordsTable`) with inline edit/delete and an Excel download, backed by `api/admin.ts` calling the `admin_api` blueprint.
- Frontend tests use Vitest + Testing Library (`src/test/setup.ts`), colocated as `*.test.tsx` next to the component (see `RegistrationForm.test.tsx`, `AdminPage.test.tsx`). Backend tests are a single `unittest` suite in `tests/test_api.py`.
