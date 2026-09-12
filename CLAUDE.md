# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Registration ("inscripción") site for **TelecoEmprende**, the entrepreneurship club born at ETSIT-UPM and now open to the whole UPM. Flask backend + PostgreSQL, React/TypeScript/Vite frontend, served together behind Nginx via Docker Compose. Copy and UI are in Spanish.

Production is deployed on Vercel at the custom domain `telecoemprende.es` (`www.telecoemprende.es` also configured) — see the Vercel domains list, not this repo, for DNS/domain config itself.

## Git workflow

Branches: `dev` → `staging` → `prod`. Work happens on `dev`; PR into `staging`, then `staging` into `prod`. Merging into `prod` deploys production automatically. **Always merge normally, never squash** (`gh pr merge <n> --merge`) — squash-merge is disabled at the GitHub repo level because it previously broke later merges (resurrected already-deleted code silently).

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
python -m unittest discover -s tests -v    # all backend tests (5 files: test_api, test_registros, test_marketing, test_equipo_registro, test_cron)
python -m unittest tests.test_api.<TestClass>.<test_method>   # single test
```

### `demo/` and `juego/` (standalone, not part of the main frontend)

Two independent Vite/static projects at the repo root, each its own Vercel service (see below) — neither shares a build, deps, or CSS with `frontend/`:

```bash
cd demo && npm install && npm run dev   # standalone React app, base '/demo/'
```

`juego/` has no `npm install`/build step at all — plain HTML/CSS/JS with native ES modules, served as-is; see `juego/README.md`.

### Docker (full stack)

```bash
docker compose up --build -d
docker compose logs -f
docker compose down
```

Requires a root `.env` with `ADMIN_PASSWORD`, `FLASK_SECRET_KEY`, `POSTGRES_PASSWORD`, `CERTBOT_EMAIL` (see `.env.example`).

### Vercel + Supabase (production deploy)

The repo deploys to Vercel via `vercel.json`, which defines four **services**: `backend` (this Flask app, `framework: flask`, `entrypoint: app.py`, `root: .`), `frontend` (the main Vite build, `root: frontend/`), `demo` (`root: demo/`) and `juego` (`root: juego/`, no framework/build). Top-level rewrites send `/api/*` to `backend`, `/demo` and `/demo/*` to `demo`, `/juego` and `/juego/*` to `juego`, and everything else to `frontend`; each of `demo`/`juego` also has its own internal rewrite stripping its path prefix before falling back to its own `index.html`. `vercel.json` also declares a cron (`/api/cron/avisar-deadlines`, daily 08:00 — see Architecture) and the security headers applied in prod (CSP, HSTS, etc. — `app.py`'s `after_request` applies the same set for local/Docker). Postgres is Supabase, provisioned through the Vercel Marketplace integration (`vercel integration add supabase`), which injects `POSTGRES_URL`/`POSTGRES_URL_NON_POOLING` etc. — `DATABASE_URL` must be set manually to the pooled `POSTGRES_URL` **with the trailing `&supa=base-pooler.x` query param stripped**, since `psycopg2` rejects that vendor-specific param. Use `vercel env add` / `vercel deploy --prod` (via `npx vercel@latest`, no global install needed).

The `frontend` service in `vercel.json` does rewrite `/(.*)` to `/index.html`, so a client-only route will not 404 on Vercel by itself. What each `frontend/<route>/index.html` buys (identical shell, different `<title>`/meta tags, wired as extra Rollup entry points in `frontend/vite.config.ts`'s `build.rollupOptions.input`) is a real title and meta description for that URL — a static file wins over the rewrite. So a new **top-level** route wants its own `index.html` + input entry for the tab title and link previews; nested routes like `/admin/equipo` fall back to the main `index.html` and are fine without one. The Flask dev server has no such fallback: routes it does not declare 404 locally (see the `/admin/<vista>` route in `app.py`). Docker/nginx already does `try_files ... /index.html`.

## Architecture

- **`app.py`** is the Flask entrypoint. It registers five blueprints — `public_api`, `admin_api`, `equipo_api`, `cron_api`, and `marketing_api` (registered **three times**, once per department, see below) — applies security headers (CSP, X-Frame-Options, etc.) in `after_request`, and also serves the built frontend (`frontend/dist`) directly — `/`, `/admin`, `/assets/<file>`, `/logo.png` all read from the Vite build output. There is no separate static file server in dev; in prod Nginx sits in front (see `docker-compose.yml` / `frontend/` Dockerfile). Note `demo/` and `juego/` are *not* served by Flask at all — they're separate Vercel services (see Commands).
- **`backend/api/public.py`** and **`backend/api/admin.py`** back the public registration form and the `/admin` panel. Business logic is not inline in the routes — it lives in **`backend/services/`**:
  - `services/registrations.py` — CRUD for registrations, Excel export (`openpyxl`) generated in memory on demand (`generar_excel_en_memoria`) for the admin download — nothing is read from or written to disk at request time. `EXCEL_FILE` in `backend/config.py` is unused leftover from the pre-Postgres era.
  - `services/security.py` — honeypot + rate limiting (`MAX_REQUESTS_PER_MINUTE` / `BLOCK_WINDOW_SECONDS` in `backend/config.py`), input sanitization against SQL injection/XSS.
  - `services/admin.py` — session-cookie based admin auth (`ADMIN_PASSWORD` env var, no user table).
  - `services/email.py` — transactional email via Resend HTTP API (`RESEND_API_KEY`); per-status subject/body templates. Like Slack below, a missing API key or a send failure is swallowed — never blocks the operation that triggered it.
  - `backend/schemas.py` — request/response validation shapes; `build_response` is the shared JSON envelope every blueprint returns.
  - `backend/config.py` — all env-driven constants (DB URL, field length limits, UPM email domain allowlist, rate-limit knobs).
- Registrations are stored in Postgres (table `registrations`); `DATABASE_URL` defaults to a local dev Postgres in `config.py`.
- **The `/equipo` self-serve workspace** is a separate system from `/admin`, with its own email+password login (`equipo_api` in `backend/api/equipo.py`, `services/equipo.py`, table `equipo_accesos`) — not the same auth as `ADMIN_PASSWORD`. A person's `equipos` array (`marketing`/`eventos`/`ingenieria`) and `cargo` (`presidente`/`boardmember`/``) decide what they see; anyone with `ingenieria` or a board `cargo` also gets an admin session and can reach `/admin` (`EQUIPO_CON_PERMISOS_ADMIN` in `backend/config.py`). Accounts, department membership, and the shared calendar are managed from `/admin` (`EquipoAccesosPanel`, `CalendarioPanel`) — `/equipo` itself only reads them (`GET /api/equipo/session`, `GET /api/equipo/calendario`).
  - **`backend/api/marketing.py`** / **`services/marketing.py`** is the per-department workspace API (campaigns, content, tasks, calendar, member workload) — routes are declared once but the blueprint is registered three times in `app.py` with a different `name` (`marketing_api`, `eventos_api`, `ingenieria_api`); `departamento_actual()` reads `request.blueprint` to scope every query, so the same code serves all three departments without duplicating routes. Every route requires `@requiere_equipo` (membership in that specific department, checked server-side). In the Eventos department the same tables are relabeled in the UI ("Campañas"→"Eventos", "Tareas"→"Gestiones").
  - **`backend/api/registros.py`** / **`services/registros.py`** adds five more entities (`recursos`, `presupuesto`, `anuncios`, `reuniones`, `alumni`) as routes hung directly onto `marketing_api` — imported in `app.py` purely for that side effect, and *before* the blueprint gets registered (Flask forbids adding routes to an already-registered blueprint). All five reuse one generic CRUD mount (`_montar_rutas`) and inherit `marketing_api`'s auth/department-scoping. `anuncios` is the one exception: it has no `departamento` column and is visible club-wide regardless of which department's route served it.
  - **`backend/api/cron.py`** — `POST /api/cron/avisar-deadlines`, triggered only by Vercel Cron (daily 08:00, see `vercel.json`), authorized via a bearer `CRON_SECRET` header (never a session cookie). Posts a Slack alert for tasks due tomorrow across all departments.
  - **`services/slack.py`** — Incoming Webhook POSTs (`SLACK_WEBHOOK_URL`), no OAuth/app; used for task-created, task-status-change, and the cron deadline digest. Same fail-open behavior as `services/email.py`.
  - Frontend: `frontend/src/routes/EquipoPage.tsx` is the whole `/equipo` page (session check → login or dashboard). `components/equipo/DeptoDashboard.tsx` is shared by all three departments (only `depto` changes, plus `teams` for the person's full department list); `components/equipo/marketing/*` holds the Campaigns/Tasks/Members panels and `CalendarPanel` (named `marketing/` for historical reasons — all three departments use it); `components/equipo/registros/*` is the generic panel (`RegistrosPanel`) for the five `registros` entities, configured per-entity in `paneles.tsx`; `components/equipo/EquipoSidebar.tsx`'s `PANELES_POR_EQUIPO` decides which per-department panels each person sees. The calendar is not one of them: since it can already show and filter every department's events from one screen, it hangs off the Club group instead (`clubDe`, same pattern as Anuncios) — one "Calendario" entry per person, not one per department. `CalendarPanel` reads `teams` to decide what "solo lo mío" means and whether creating a task needs a department picker, and opening a calendar item that belongs to a different one of the person's own departments remounts `DeptoDashboard` in that department's context via the same `?campaign=` deep-link mechanism used for shared links.
  - **`/equipo` is the only part of the codebase on Tailwind + shadcn/ui** (`components/ui/*`; add more via `cd frontend && npx shadcn@latest add <component>`) — everywhere else is the hand-authored plain CSS described below. Tailwind's preflight/reset is deliberately disabled (`index.css` imports `tailwindcss/theme.css` + `tailwindcss/utilities.css` separately, not the bundled `@import "tailwindcss"`) so it can't leak into the public site, and Tailwind utility classes only take effect inside the `.shadcn-scope` wrapper (`/equipo`'s root), which remaps the 6 token names shadcn expects (`--color-primary`, `--color-background`, etc.) to the values in `tokens.css` so both systems share one palette. Don't touch `landing.css`/`home.css`/`admin.css` for `/equipo` work — add to `equipo.css` or use Tailwind classes instead.
- **Frontend routing** (`frontend/src/App.tsx`) is a flat `react-router-dom` route table: `/` (`HomePage`), `/charla-santi-y-pablo` (`EventoSantiPabloPage`, a standalone past-event landing page with its own `Footer`), `/gracias` (`ThankYouPage`), `/privacidad` (`PrivacyPolicyPage`), `/equipo` (`EquipoPage`) and the nested `/admin/*` block (`routes/admin/index.tsx`).
- **`HomePage`** composes the landing page from `components/home/*` sections in order (Hero, About/team, Departments, Events, Requirements, RegistrationForm) plus `LandingFooter`. Styling is plain CSS in `frontend/src/styles/*.css` (`landing.css` for the public site, `admin.css` for the admin panel, `tokens.css` for shared CSS variables) — hand-authored, no CSS framework/modules (`lp-*` prefix for landing sections, `*-react` suffix in the registration form/admin areas). `/equipo` is the one exception — see Tailwind/shadcn above.
- **Brand**: `docs/brand-guide.html` is the source of truth — four official colours (tinta `#112532`, ámbar `#f4b044`, naranja `#e0680e`, acero `#88a5b7`) plus paper/slate neutrals, and two typefaces (**Anton** for display/H1-H2, **Space Grotesk** 400-700 for body and UI; Space Grotesk has no weight above 700, and Anton has only 400). Every colour in `frontend/` (landing, `/admin`, `/equipo`) resolves through `tokens.css`; no hex or `rgba()` is written by hand in a component or a stylesheet there. `demo/` and `juego/` are standalone Vercel services that share no CSS with `frontend/` — each hardcodes its own copy of the same palette as literal hex custom properties instead (see `juego/game.css`, `demo/src/index.css`), so a brand colour change has to be applied in all three places by hand. Departments carry their own colour (Tech = acero, Marketing = naranja, Eventos = ámbar, exposed as `--color-depto-*`).
- **Registration form** (`components/home/RegistrationForm.tsx`) drives programa selection off `frontend/src/data/upmSchools.ts` (`UPM_SCHOOLS`): pick an Escuela first, which filters the Grado/Máster `<select>` to that school's `grados`/`masters`. The submitted `estudios` string is built client-side as `Grado - <nombre completo>` or the master's full name (see `buildEstudios`) — the backend just receives free text, it has no knowledge of the school/program catalog. Client validation lives in `utils/validation.ts` (`UPM_EMAIL_PATTERN` requires `@alumnos.upm.es` or `@upm.es`, Drive-link pattern, required fields); the same constraints are re-enforced server-side via `backend/config.py`/`schemas.py`.
- **Admin panel** (`routes/admin/*`, `components/admin/*`) is password-gated and split into three views behind nested routes, declared once in `routes/admin/index.tsx` (`adminRoutes`, reused by `App.tsx` and the tests): `/admin/inscripciones` (`InscripcionesView` — stats, state tabs, `RecordsTable` with inline edit/delete, search, Excel download, copy-emails), `/admin/equipo` (`EquipoAccesosPanel`) and `/admin/calendario` (`CalendarioPanel`); `/admin` redirects to the first. `AdminLayout` owns the session (login form, logout, `AlertBanner`) and the workspace shell, and hands views `{ avisar, avisarError }` through `useOutletContext` (`useAdmin()`) — there is no store. Navigation is `AdminSidebar`, whose `NAV` array is the single source for the sidebar, the top-bar title and the routes. The inscripciones filters (`evento`, `estado`, `q`) live in the URL via `useSearchParams`, so a filtered view is linkable and survives a reload.
- The `/admin` and `/equipo` workspaces share one shell in `equipo.css` under the neutral `workspace-*` class names (`workspace-react`, `-main-`, `-barra-`, `-barra-depto-`, `-contenido-`, `-marca-*`); `admin.css` only styles the logged-out page. Adding a view to `/admin` means touching `NAV`, `adminRoutes` and the `any(...)` converter in `app.py`'s `/admin/<vista>` route (Vercel needs nothing: the frontend service already rewrites `/(.*)` to `/index.html`).
- Frontend tests use Vitest + Testing Library (`src/test/setup.ts`), colocated as `*.test.tsx` next to the component (see `RegistrationForm.test.tsx`, `routes/admin/AdminPanel.test.tsx`). Backend tests are `unittest`, split across `tests/test_api.py` (registrations/admin), `tests/test_registros.py`, `tests/test_marketing.py` (the largest — campaigns/content/tasks/calendar/members/Slack/department-isolation), `tests/test_equipo_registro.py` and `tests/test_cron.py`.
