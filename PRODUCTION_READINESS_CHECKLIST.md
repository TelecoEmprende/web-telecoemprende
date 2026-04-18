# Production Readiness Checklist

This document turns the current codebase state into a concrete launch checklist.

Scope:
- Backend: Flask API, admin auth, registration persistence
- Frontend: public site, thank-you flow, admin UI
- Ops: deployment, monitoring, backups, environment management

The checklist is split into:
- `Must-have before launch`: blockers for a safe and reliable production release
- `Nice-to-have after launch`: important improvements that can follow once the core launch is safe

---

## Must-Have Before Launch

### 1. Remove insecure defaults for secrets and admin access

Status now:
- [`backend/config.py`](./backend/config.py) falls back to `ADMIN_PASSWORD = "telecoemprende2026"`
- [`app.py`](./app.py) generates a temporary Flask secret key if `FLASK_SECRET_KEY` is missing
- [`app.py`](./app.py) still has `SESSION_COOKIE_SECURE = False`
- [`app.py`](./app.py) runs with `debug=True` in `__main__`

Why this matters:
- A default admin password is not acceptable in production
- Regenerating the Flask secret on restart invalidates sessions and hides misconfiguration
- Non-secure session cookies expose session risk over plain HTTP
- Debug mode must never be enabled publicly

How to implement:
1. Change config loading so required production secrets must exist
2. Fail app startup if `ADMIN_PASSWORD` or `FLASK_SECRET_KEY` is missing in production
3. Make `SESSION_COOKIE_SECURE` depend on environment, and set it to `True` in production
4. Stop using `app.run(..., debug=True)` for production; run through Gunicorn or another WSGI server

Concrete changes:
- Add env-based settings in [`backend/config.py`](./backend/config.py):
  - `ENVIRONMENT`
  - `FLASK_SECRET_KEY`
  - `ADMIN_PASSWORD`
  - `SESSION_COOKIE_SECURE`
- Raise an exception on startup when required production variables are missing
- In [`app.py`](./app.py), import those settings instead of hardcoding values

Suggested shape:

```python
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
FLASK_SECRET_KEY = os.environ.get("FLASK_SECRET_KEY")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

if ENVIRONMENT == "production":
    if not FLASK_SECRET_KEY:
        raise RuntimeError("FLASK_SECRET_KEY is required in production")
    if not ADMIN_PASSWORD:
        raise RuntimeError("ADMIN_PASSWORD is required in production")
```

Validation:
- App must fail fast if secrets are missing in production
- Admin login must only work with env-provided credentials
- Session cookie must be marked `Secure` in production browser responses

---

### 2. Replace Excel storage with a real database

Status now:
- Registrations are stored in `registros_evento.xlsx`
- Duplicate email detection is done by reading the spreadsheet
- Writes are file-based and not concurrency-safe

Why this matters:
- File writes are fragile under concurrent requests
- Duplicate checks are not atomic
- Multiple app instances will not coordinate correctly
- Backups, auditability, and reporting are harder than they need to be

Recommended target:
- PostgreSQL

Minimum schema:
- `registrations`
  - `id`
  - `nombre`
  - `apellidos`
  - `estudios`
  - `email` with unique constraint
  - `privacidad_aceptada`
  - `ip_registro`
  - `created_at`

How to implement:
1. Add a database client layer
2. Create a `registrations` table with a unique index on `email`
3. Replace spreadsheet reads/writes in [`backend/services/registrations.py`](./backend/services/registrations.py)
4. Keep Excel export only as an admin download format generated from DB rows
5. Update tests to use a temporary test database or transactional test setup

Concrete steps:
- Add dependency:
  - SQLAlchemy or psycopg with direct SQL
- Add migration tooling:
  - Alembic if using SQLAlchemy
- Replace:
  - `email_ya_registrado(email)` with a DB query
  - `guardar_registro(...)` with an `INSERT`
  - `obtener_registros()` with a `SELECT`
- Catch duplicate key violations and return the existing `409 Ese correo ya está registrado.`

Validation:
- Two simultaneous submissions with the same email must result in exactly one successful registration
- Admin table and download must still work

---

### 3. Define and operationalize manual email communication

Status now:
- The user flow says attendees will receive event information by email
- The backend does not send automated emails
- The team plans to handle that communication manually for now

Why this matters:
 - This is still a user-facing promise
 - Even if email is manual, the operational process must be reliable and documented
 - If no one owns the communication step, attendees may never receive the event details

How to implement:
1. Decide exactly when the manual email will be sent
2. Make the website copy match that operational reality
3. Define who is responsible for sending it
4. Define where the recipient list comes from and how it is reviewed before sending
5. Define a fallback if the primary responsible person is unavailable

Recommended operational process:
- Export the attendee list from the admin panel
- Review duplicates or obvious data issues before sending
- Send one manual event-information email batch 3 days before the event
- Keep a simple internal checklist confirming the send happened

Minimum email content:
- Subject: `Información para Teleco Builders 2026`
- Body:
  - reminder that the attendee is registered
  - date, time, and venue
  - arrival instructions if needed
  - organizer contact or WhatsApp link

Concrete repo changes:
- Keep the thank-you page wording accurate
- Add a short internal operations note, either in `README.md` or a new `OPERATIONS.md`, explaining:
  - when the email batch must be sent
  - who sends it
  - where the attendee data is exported from
  - how completion is confirmed

Validation:
- The website must not imply immediate automated email delivery if that is not true
- The team must have a written manual process for sending the event-information email
- Before the event, there must be a clear owner for executing that send

---

### 4. Move rate limiting out of process memory

Status now:
- [`backend/services/security.py`](./backend/services/security.py) uses an in-memory dict `request_log`

Why this matters:
- It resets on restart
- It does not work across multiple workers or containers
- It is easy to bypass behind multiple instances

Recommended target:
- Redis-backed rate limiting
- Or edge/load-balancer rate limiting if your hosting platform supports it

How to implement:
1. Replace the dict-based limiter with a shared store
2. Separate limits for:
  - public registration endpoint
  - admin login endpoint
3. Use IP-based buckets at minimum
4. If behind a proxy, configure trusted forwarding correctly

Concrete implementation options:
- Flask-Limiter with Redis storage
- Custom Redis counter with TTL

Validation:
- Limits must still hold after server restart
- Limits must be shared across all app instances

---

### 5. Add proper production deployment configuration

Status now:
- The repo explains local usage
- There is no production deployment definition in the repo

Why this matters:
- Production should be reproducible, not manually improvised

Minimum production setup:
- Gunicorn serving Flask
- Reverse proxy or hosting platform with HTTPS
- Environment variables managed securely
- Static frontend build generated in CI/CD or release step

How to implement:
1. Add a production entrypoint command
2. Add a deployment doc or script
3. Add `.env.example` with required variables only, no secrets
4. Decide hosting model:
  - single VM with Nginx + Gunicorn
  - container deployment
  - platform-as-a-service

Suggested commands:

```bash
cd frontend
npm ci
npm run build

cd ..
gunicorn app:app --bind 0.0.0.0:5000 --workers 2
```

Files worth adding:
- `.env.example`
- `DEPLOYMENT.md`
- optional `Dockerfile`
- optional `docker-compose.yml`

Validation:
- A fresh environment must be able to deploy from docs alone

---

### 6. Add structured logging and error reporting

Status now:
- There is no visible structured application logging strategy
- There is no error tracking integration

Why this matters:
- Silent failures in registration or admin access are hard to diagnose

Recommended target:
- JSON logs
- Error tracking with Sentry or similar

How to implement:
1. Add request logging middleware or Flask hooks
2. Log:
  - request path
  - status code
  - response time
  - client IP
  - registration success/failure
  - admin login success/failure
3. Add exception reporting
4. Never log admin passwords or sensitive personal payloads in full

Validation:
- Failed registrations and backend exceptions should appear in logs and error tracking

---

### 7. Define backups, retention, and privacy handling

Status now:
- Personal data and IPs are stored
- No documented retention or deletion policy is visible

Why this matters:
- This is operationally and legally important

How to implement:
1. Document:
  - what data is stored
  - why it is stored
  - who can access it
  - how long it is retained
2. Add a retention process
3. If moving to DB:
  - schedule automated backups
  - define restore procedure
4. Confirm the privacy text shown in the form matches actual processing

Minimum operational policy:
- Registrations retained only as long as needed for event operations and follow-up
- Admin-only access
- Periodic deletion/archive after event cycle

Validation:
- The team should be able to answer: where is data stored, who can access it, how is it deleted

---

### 8. Add end-to-end production-critical tests

Status now:
- There are backend API tests and frontend unit/component tests
- There is no visible E2E flow coverage

Why this matters:
- Production regressions often happen at integration boundaries

Recommended target:
- Playwright or Cypress

Minimum E2E scenarios:
1. User fills registration form successfully and reaches `/gracias`
2. Invalid submission shows errors and does not submit
3. Duplicate email returns the expected message
4. Admin login works and registrations are visible

How to implement:
1. Add E2E framework
2. Seed test environment or mock backend as needed
3. Run E2E in CI before deployment

Validation:
- CI should fail if the full registration flow breaks

---

## Nice-to-Have After Launch

### 9. Add background jobs for future email automation and exports

Why:
- Keeps user-facing registration fast
- Improves reliability for retries

How to implement:
- Add a queue system such as Celery, RQ, or platform-native jobs
- Move confirmation email sending to async jobs
- Optionally generate exports asynchronously

---

### 10. Improve admin security beyond a shared password

Why:
- A single shared password is weak operationally

How to implement:
- Move to individual admin users
- Store password hashes, not plain secrets
- Consider magic-link login or SSO if available
- Add session timeout and login attempt auditing

---

### 11. Add explicit health endpoints

Why:
- Useful for uptime monitors and deployment checks

How to implement:
- Add `/health/live`
- Add `/health/ready`
- `ready` should verify critical dependencies such as DB connectivity

---

### 12. Add analytics for conversion visibility

Why:
- Helps you understand drop-off in the registration funnel

How to implement:
- Track:
  - page views
  - click on `Reservar plaza`
  - registration success
  - WhatsApp CTA clicks
- Use a privacy-conscious analytics tool if possible

---

### 13. Improve accessibility QA

Why:
- Important for real users and institutional credibility

How to implement:
- Audit color contrast
- Verify keyboard navigation
- Verify focus states
- Run Lighthouse and axe
- Add screen-reader checks to main flows

---

### 14. Add global scroll restoration for route transitions

Why:
- You already fixed `/gracias`, but a general solution scales better

How to implement:
- Add a shared scroll restoration component that listens to route changes and scrolls to top when appropriate

---

### 15. Add CI pipeline for backend and frontend

Why:
- Launch quality should not depend on manual local verification

How to implement:
1. Run backend tests
2. Run frontend tests
3. Run frontend build
4. Optionally run lint/type checks and E2E tests

Suggested pipeline stages:
- `backend-test`
- `frontend-test`
- `frontend-build`
- `deploy`

---

## Suggested Launch Order

### Phase 1: Security and deployment blockers
- Remove insecure defaults
- Add production env config
- Disable debug
- Configure secure cookies
- Add deployment docs and production server

### Phase 2: Data reliability
- Move registrations to PostgreSQL
- Add backup strategy
- Add DB-based duplicate protection

### Phase 3: User communication reliability
- Document and own the manual email process
- Keep website copy aligned with the manual send timeline

### Phase 4: Operational confidence
- Add structured logs
- Add error tracking
- Add E2E tests
- Add CI

### Phase 5: Post-launch improvements
- Background jobs
- Stronger admin auth
- Analytics
- Accessibility pass

---

## Definition of Done for Production Launch

The app is reasonably production-ready when all of the following are true:

- No default secrets or admin passwords exist
- Production startup fails if critical env vars are missing
- HTTPS is used and session cookies are secure
- Registrations are stored in a real database
- Duplicate registrations are prevented atomically
- The attendee communication process is documented and owned
- Rate limiting works across all production instances
- Logs and errors are observable
- Backups and retention are defined
- CI runs tests and build successfully before deploy
- At least one E2E registration test passes in CI

---

## Repo-Specific Immediate Next Steps

If you want the highest-leverage next implementation sequence for this repo, do it in this order:

1. Add strict environment config and remove insecure defaults
2. Add `.env.example` and `DEPLOYMENT.md`
3. Move registrations from Excel to PostgreSQL
4. Document and operationalize the manual attendee email process
5. Add Redis-backed rate limiting
6. Add CI and E2E coverage
