# React + TypeScript Migration Plan

## Goal

Migrate the current server-rendered Flask UI to a React + TypeScript frontend while keeping Flask as the backend for validation, session auth, Excel persistence, downloads, and security headers.

This plan is specific to the migration work completed in this repo:

- Backend: [app.py](./app.py)
- React frontend: `frontend/src/*`
- Legacy Jinja templates and legacy static CSS have already been retired from runtime and removed from the repo.

## Current Architecture Summary

### Backend responsibilities in `app.py`

- Session config and security headers
- Public registration form handling
- Honeypot and in-memory rate limiting
- Input sanitization and validation
- Duplicate email detection
- Excel file creation, read, write, and download
- Admin login/logout and session auth

### Frontend responsibilities in templates

- Public landing layout and registration form
- Admin login screen
- Admin records table
- Flash-message rendering

### Migration boundary

Keep in Flask:

- validation rules
- duplicate checks
- anti-bot logic
- rate limiting
- Excel storage
- admin session auth
- Excel download

Move to React + TypeScript:

- public page rendering
- admin page rendering
- form state
- loading states
- error/success states
- client-side validation UX

## Target Folder Structure

Recommended end state:

```text
Formulario-TelecoEmprende/
├── app.py
├── requirements.txt
├── MIGRATION_PLAN.md
├── backend/
│   ├── __init__.py
│   ├── config.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── registrations.py
│   │   ├── security.py
│   │   └── admin.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── public.py
│   │   └── admin.py
│   └── schemas.py
├── templates/
│   ├── index.html
│   └── admin.html
├── static/
│   ├── logo.png
│   └── style.css
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── index.html
    ├── public/
    │   └── logo.png
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── routes/
        │   ├── HomePage.tsx
        │   └── AdminPage.tsx
        ├── components/
        │   ├── layout/
        │   │   ├── Header.tsx
        │   │   └── Footer.tsx
        │   ├── home/
        │   │   ├── HeroSection.tsx
        │   │   ├── TrustSection.tsx
        │   │   └── RegistrationForm.tsx
        │   ├── admin/
        │   │   ├── AdminLoginForm.tsx
        │   │   ├── AdminToolbar.tsx
        │   │   └── RecordsTable.tsx
        │   └── feedback/
        │       └── AlertBanner.tsx
        ├── api/
        │   ├── client.ts
        │   ├── public.ts
        │   └── admin.ts
        ├── types/
        │   ├── api.ts
        │   ├── registration.ts
        │   └── admin.ts
        ├── styles/
        │   ├── tokens.css
        │   ├── base.css
        │   ├── layout.css
        │   ├── home.css
        │   └── admin.css
        └── utils/
            └── validation.ts
```

## Proposed Backend Refactor

### New files to add

#### `backend/config.py`

Purpose:

- centralize environment variables
- define constants currently embedded in `app.py`

Move here:

- `EXCEL_FILE`
- `ADMIN_PASSWORD`
- `MAX_REQUESTS_PER_MINUTE`
- `BLOCK_WINDOW_SECONDS`
- `MAX_NOMBRE_LEN`
- `MAX_APELLIDOS_LEN`
- `MAX_ESTUDIOS_LEN`
- `MAX_EMAIL_LEN`

#### `backend/services/registrations.py`

Purpose:

- isolate Excel and registration logic

Move here:

- `crear_excel_si_no_existe`
- `ajustar_columnas`
- `email_ya_registrado`
- `guardar_registro`
- `obtener_registros`

#### `backend/services/security.py`

Purpose:

- isolate validation and anti-abuse logic

Move here:

- `limpiar_texto`
- `email_valido`
- `longitud_valida`
- `obtener_ip_real`
- `demasiadas_peticiones`

#### `backend/services/admin.py`

Purpose:

- keep admin-specific auth/session helpers in one place

Suggested helpers:

- `admin_password_configured() -> bool`
- `is_admin_authenticated() -> bool`
- `login_admin(password: str) -> bool`
- `logout_admin() -> None`

#### `backend/schemas.py`

Purpose:

- define response and input normalization helpers

Suggested contents:

- registration payload field names
- response builders
- error shape conventions

This can stay simple Python dictionaries at first. No need to introduce Marshmallow or Pydantic unless the project grows.

#### `backend/api/public.py`

Purpose:

- public JSON routes

Suggested routes:

- `POST /api/registrations`

#### `backend/api/admin.py`

Purpose:

- admin JSON routes

Suggested routes:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/registrations`
- `GET /api/admin/download`

## Endpoint Contracts

### 1. `POST /api/registrations`

Purpose:

- submit a public event registration without relying on server-rendered flash messages

Request body:

```json
{
  "nombre": "Juan",
  "apellidos": "Perez Garcia",
  "estudios": "ETSIT UPM / Ingenieria de Telecomunicacion",
  "email": "juan@example.com",
  "privacidad": true,
  "telefono_oculto": ""
}
```

Success response:

```json
{
  "ok": true,
  "message": "Registro completado. Te contactaremos pronto con la informacion del evento."
}
```

Validation error response:

```json
{
  "ok": false,
  "message": "Hay errores de validacion.",
  "errors": {
    "email": "Introduce un correo electronico valido."
  }
}
```

Duplicate email response:

```json
{
  "ok": false,
  "message": "Ese correo ya esta registrado."
}
```

Rate limit response:

```json
{
  "ok": false,
  "message": "Demasiadas solicitudes desde esta red. Intentalo en un minuto."
}
```

Status code guidance:

- `201` on success
- `400` on validation failure
- `409` on duplicate email
- `429` on rate limit

### 2. `POST /api/admin/login`

Request body:

```json
{
  "password": "secret"
}
```

Success response:

```json
{
  "ok": true,
  "message": "Sesion iniciada."
}
```

Failure response:

```json
{
  "ok": false,
  "message": "Contrasena incorrecta."
}
```

Status code guidance:

- `200` on success
- `401` on invalid password
- `503` if `ADMIN_PASSWORD` is not configured

### 3. `POST /api/admin/logout`

Success response:

```json
{
  "ok": true,
  "message": "Sesion cerrada correctamente."
}
```

Status code guidance:

- `200`

### 4. `GET /api/admin/session`

Success response:

```json
{
  "ok": true,
  "authenticated": true
}
```

If not authenticated:

```json
{
  "ok": true,
  "authenticated": false
}
```

Status code guidance:

- `200`

### 5. `GET /api/admin/registrations`

Authenticated success response:

```json
{
  "ok": true,
  "total": 2,
  "registros": [
    {
      "nombre": "Juan",
      "apellidos": "Perez Garcia",
      "estudios": "ETSIT UPM",
      "email": "juan@example.com",
      "privacidad": "Si",
      "fecha": "2026-04-16 11:00:00"
    }
  ]
}
```

Unauthorized response:

```json
{
  "ok": false,
  "message": "No autorizado."
}
```

Status code guidance:

- `200` when authenticated
- `401` when not authenticated

### 6. `GET /api/admin/download`

Behavior:

- same Excel file as current `/admin/descargar`
- keep session auth requirement

Status code guidance:

- `200` with file response
- `401` when not authenticated
- `404` when file does not exist

## TypeScript Types

### `frontend/src/types/registration.ts`

```ts
export type RegistrationPayload = {
  nombre: string;
  apellidos: string;
  estudios: string;
  email: string;
  privacidad: boolean;
  telefono_oculto?: string;
};

export type RegistrationErrors = Partial<Record<keyof RegistrationPayload, string>>;
```

### `frontend/src/types/api.ts`

```ts
export type ApiSuccess = {
  ok: true;
  message?: string;
};

export type ApiFailure = {
  ok: false;
  message: string;
  errors?: Record<string, string>;
};

export type ApiResult = ApiSuccess | ApiFailure;
```

### `frontend/src/types/admin.ts`

```ts
export type Registro = {
  nombre: string;
  apellidos: string;
  estudios: string;
  email: string;
  privacidad: string;
  fecha: string;
};

export type AdminSessionResponse = {
  ok: true;
  authenticated: boolean;
};

export type AdminRegistrationsResponse =
  | {
      ok: true;
      total: number;
      registros: Registro[];
    }
  | {
      ok: false;
      message: string;
    };
```

## Frontend Build Decisions

### Tooling

Use:

- React
- TypeScript
- Vite

Do not add heavy libraries immediately unless needed.

Initial recommendation:

- no Redux
- no form library on day one
- no CSS-in-JS
- no component library

This repo is small enough for local component state and a thin fetch wrapper.

### API client

Add:

- `frontend/src/api/client.ts`

Responsibilities:

- base fetch wrapper
- JSON parsing
- `credentials: "include"` for admin session routes
- normalized error handling

### Routing

Use `react-router-dom`.

Initial routes:

- `/`
- `/admin`

The Flask app can serve the built SPA shell for both routes after cutover.

## CSS Migration Plan

Current stylesheet baseline:

- legacy `static/style.css` during migration
- current React styles under `frontend/src/styles/*`

Recommended first pass:

- preserve visual design
- move CSS variables first
- then split styles by page/section

Suggested extraction:

- `tokens.css`: root variables, colors, shadows, radii, spacing
- `base.css`: resets, `body`, `a`, `img`, `button`, `input`
- `layout.css`: shared containers, header, footer
- `home.css`: hero, trust, form sections
- `admin.css`: admin login, toolbar, table

Do not redesign during the migration unless there is a clear bug. The goal is to reduce behavior risk.

## CSP and Static Asset Implications

Current CSP is set in [app.py](./app.py).

Current rule:

- `script-src 'self'`

Implication:

- Vite dev mode will not work under the current CSP without adjustment
- production bundle is easier because it can be served from same origin

Recommended approach:

### Development

Allow the Vite dev server origin temporarily, for example:

- `http://localhost:5173`

Also allow WebSocket/HMR connection during development.

### Production

Serve built frontend assets from Flask static hosting and keep `script-src 'self'`.

This is safer and simpler than opening CSP broadly in production.

## Phased Implementation Checklist

### Phase 1: Backend refactor without behavior changes

- [ ] Create `backend/` package
- [ ] Add `backend/config.py`
- [ ] Move Excel helpers to `backend/services/registrations.py`
- [ ] Move validation and abuse-prevention helpers to `backend/services/security.py`
- [ ] Add `backend/services/admin.py`
- [ ] Keep legacy routes in `app.py` working exactly as they do now
- [ ] Verify current public and admin pages still work after refactor

Definition of done:

- no user-visible changes
- routes `/`, `/admin`, `/admin/logout`, `/admin/descargar` still behave exactly the same

### Phase 2: Add JSON API

- [ ] Add `backend/api/public.py`
- [ ] Add `backend/api/admin.py`
- [ ] Implement `POST /api/registrations`
- [ ] Implement `POST /api/admin/login`
- [ ] Implement `POST /api/admin/logout`
- [ ] Implement `GET /api/admin/session`
- [ ] Implement `GET /api/admin/registrations`
- [ ] Implement `GET /api/admin/download`
- [ ] Return JSON instead of flashes for API routes
- [ ] Preserve existing session-cookie behavior for admin auth

Definition of done:

- API routes are usable independently of templates
- legacy pages still work

### Phase 3: Bootstrap React + TypeScript app

- [ ] Create `frontend/`
- [ ] Initialize Vite React TypeScript app
- [ ] Add `react-router-dom`
- [ ] Add `src/types/*`
- [ ] Add `src/api/*`
- [ ] Copy `logo.png` into `frontend/public/`
- [ ] Set up Vite dev proxy for `/api`

Definition of done:

- `frontend` can start locally
- frontend can call Flask API in development

### Phase 4: Implement public page in React

- [ ] Build `HomePage.tsx`
- [ ] Add shared `Header` and `Footer`
- [ ] Add `HeroSection`
- [ ] Add `TrustSection`
- [ ] Add `RegistrationForm`
- [ ] Wire form to `POST /api/registrations`
- [ ] Add inline field errors
- [ ] Add success and failure banners
- [ ] Keep honeypot field in request shape

Definition of done:

- registration works end-to-end from React
- success and error states replace flash-message dependency

### Phase 5: Implement admin page in React

- [ ] Build `AdminPage.tsx`
- [ ] On load, call `GET /api/admin/session`
- [ ] If unauthenticated, show `AdminLoginForm`
- [ ] On login, call `POST /api/admin/login`
- [ ] If authenticated, fetch `GET /api/admin/registrations`
- [ ] Render `RecordsTable`
- [ ] Add logout action via `POST /api/admin/logout`
- [ ] Add Excel download link/button using `/api/admin/download`

Definition of done:

- admin flow works end-to-end from React
- no dependency on `templates/admin.html`

### Phase 6: CSS migration

- [ ] Split `style.css` into frontend CSS files
- [ ] Preserve responsive behavior
- [ ] Verify public page at mobile and desktop widths
- [ ] Verify admin table layout remains usable

Definition of done:

- React pages visually match current site closely enough
- CSS is organized by concern instead of one large file

### Phase 7: Cutover

- [ ] Build frontend for production
- [ ] Serve built assets from Flask
- [ ] Replace template rendering routes with SPA shell route(s)
- [ ] Keep API routes under `/api/*`
- [ ] Remove legacy flash-driven UI assumptions
- [ ] Retire legacy Jinja templates from runtime
- [ ] Remove legacy template files after cutover

Definition of done:

- public and admin UI are fully React-based
- Flask is backend/API host

### Phase 8: Cleanup and tests

- [ ] Add backend tests for validation
- [ ] Add backend tests for duplicate-email flow
- [ ] Add backend tests for admin auth/session behavior
- [ ] Add backend tests for download authorization
- [ ] Add frontend test for registration success/failure
- [ ] Add frontend test for admin login and records table
- [ ] Update README with frontend and backend dev instructions

## File-by-File Initial Task List

### Existing files to modify first

- [ ] [app.py](./app.py)
- [ ] [README.md](./README.md)

### Existing files to keep temporarily

- [ ] Legacy templates and legacy static assets during migration only

### New backend files to add

- [ ] `backend/__init__.py`
- [ ] `backend/config.py`
- [ ] `backend/schemas.py`
- [ ] `backend/services/__init__.py`
- [ ] `backend/services/registrations.py`
- [ ] `backend/services/security.py`
- [ ] `backend/services/admin.py`
- [ ] `backend/api/__init__.py`
- [ ] `backend/api/public.py`
- [ ] `backend/api/admin.py`

### New frontend files to add

- [ ] `frontend/package.json`
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/tsconfig.node.json`
- [ ] `frontend/vite.config.ts`
- [ ] `frontend/index.html`
- [ ] `frontend/public/logo.png`
- [ ] `frontend/src/main.tsx`
- [ ] `frontend/src/App.tsx`
- [ ] `frontend/src/routes/HomePage.tsx`
- [ ] `frontend/src/routes/AdminPage.tsx`
- [ ] `frontend/src/components/layout/Header.tsx`
- [ ] `frontend/src/components/layout/Footer.tsx`
- [ ] `frontend/src/components/home/HeroSection.tsx`
- [ ] `frontend/src/components/home/TrustSection.tsx`
- [ ] `frontend/src/components/home/RegistrationForm.tsx`
- [ ] `frontend/src/components/admin/AdminLoginForm.tsx`
- [ ] `frontend/src/components/admin/AdminToolbar.tsx`
- [ ] `frontend/src/components/admin/RecordsTable.tsx`
- [ ] `frontend/src/components/feedback/AlertBanner.tsx`
- [ ] `frontend/src/api/client.ts`
- [ ] `frontend/src/api/public.ts`
- [ ] `frontend/src/api/admin.ts`
- [ ] `frontend/src/types/api.ts`
- [ ] `frontend/src/types/registration.ts`
- [ ] `frontend/src/types/admin.ts`
- [ ] `frontend/src/utils/validation.ts`
- [ ] `frontend/src/styles/tokens.css`
- [ ] `frontend/src/styles/base.css`
- [ ] `frontend/src/styles/layout.css`
- [ ] `frontend/src/styles/home.css`
- [ ] `frontend/src/styles/admin.css`

## Open Decisions

These decisions should be made before implementation starts:

### 1. Deployment model

Choose one:

- Flask serves React build artifacts
- React frontend deploys separately from Flask backend

Recommendation:

- Flask serves the built frontend for simplicity

### 2. Admin route shape after cutover

Choose one:

- SPA route at `/admin`
- dedicated HTML shell for admin

Recommendation:

- use SPA route at `/admin`

### 3. Testing scope

Minimum acceptable:

- backend API tests
- one frontend integration test per major flow

## Recommended Start Order

If implementation starts now, use this order:

1. Extract backend helpers from `app.py`
2. Add JSON API routes while keeping templates intact
3. Scaffold `frontend/` with Vite + React + TypeScript
4. Build public form flow
5. Build admin flow
6. Cut over serving/routing
7. Remove legacy templates

## Success Criteria

The migration is complete when:

- public registration works from React against Flask JSON APIs
- admin login and records table work from React against Flask JSON APIs
- Excel download still works with session auth
- templates are no longer required for UI rendering
- Flask remains responsible for validation, storage, auth, and security headers
