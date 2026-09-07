# Contexto — TelecoEmprende

Club de emprendimiento nacido en la ETSIT-UPM, abierto este curso a toda la UPM.

- **Web:** https://telecoemprende.es
- **Repo:** github.com/TelecoEmprende/web-telecoemprende (org `TelecoEmprende`)
- **Ramas:** `dev` → `staging` → `prod`. Se trabaja en `dev`, se promociona con PR a
  `staging` y luego a `prod`. Producción (`telecoemprende.es`) se despliega sola al
  mergear en `prod`.
  **Usa siempre merge normal (`gh pr merge <n> --merge --repo TelecoEmprende/web-telecoemprende`), nunca squash**:
  el squash está desactivado en el repo porque rompía los merges siguientes (llegó a
  resucitar en silencio código ya borrado).
- **Día de la demo:** _(pendiente — falta la fecha)_

## Equipo

| Nombre | Rol | Programa | Nota |
|---|---|---|---|
| Mariano | Ex-presidente · Board Member | MUIT · HEC Paris · ETSIT | Puso en marcha TelecoEmprende, ahora lo sigue desde HEC Paris |
| Jorge | Ex-vicepresidente · Board Member | MUIT · IIT · ETSIT | El del buen gusto del equipo |
| Hammad | Presidente | GISD · ETSIT | Coordina el día a día |
| Alex | Ex-secretario · Board Member | MUIT · ETSIT | Apoyo desde la sombra |
| Iker | **VP de Eventos y Logística** | GISD · ETSIT | Dirección de Eventos, logística, cartelería y materiales visuales |
| Abril | **VP de Tech e Ingeniería** | GISD · ETSIT | Tecnología, ingeniería, producto y soporte técnico |
| Mamoun | Miembro · Gestión Logística de Eventos | GII · ETSIINF | Organización logística, materiales, espacios y necesidades operativas |
| Diego | Miembro · Comunicación de Eventos | GIB · ETSIT | Comunicación, promoción, captación y RRSS vinculadas a Eventos |
| David | Miembro · Preparación de Eventos | GISD · ETSIT | Preparación operativa, montaje, coordinación previa y ejecución |
| Hugo | Miembro · Operaciones de Eventos | GITST · ETSIT | Apoyo en montaje, ejecución y necesidades operativas |
| Guillermo | Miembro · Experiencia y Activaciones de Eventos | GITST · ETSIT | Apoyo en dinámicas, demos, activaciones y ejecución durante Eventos |

_(Fuente: `frontend/src/components/home/AboutSection.tsx`.)_

---

# Cómo tocar la UI de `/equipo`

Esta parte está escrita para quien vaya a rediseñar el área interna del equipo.

## Qué es `/equipo`

Área privada para el equipo del club, con login propio (email + contraseña),
separada del panel `/admin`. Al entrar, cada persona ve solo los paneles de los
departamentos a los que pertenece, más un calendario compartido.

## Archivos que vas a tocar

| Archivo | Qué es |
|---|---|
| `frontend/src/routes/EquipoPage.tsx` | La página entera: comprueba sesión, muestra login o el dashboard, y reparte las pestañas por equipo |
| `frontend/src/components/equipo/DeptoDashboard.tsx` | Los paneles de un departamento. **Marketing y Eventos usan el mismo componente**: solo cambia el `depto` |
| `frontend/src/components/equipo/DeptoApi.tsx` | Ata las llamadas de API al departamento abierto (`useApi()`) |
| `frontend/src/components/equipo/marketing/*` | Los cinco paneles (Resumen, Campañas, Tareas, Calendario, Miembros). Se llaman `marketing/` por herencia: los usan los dos departamentos |
| `frontend/src/components/equipo/CalendarioEquipo.tsx` | Calendario compartido, solo lectura |
| `frontend/src/components/equipo/EquipoLoginForm.tsx` | Formulario de acceso |
| `frontend/src/styles/equipo.css` | Lo poco de CSS propio que queda (el resto es Tailwind) |

## Stack: shadcn/ui + Tailwind, pero **solo dentro de `/equipo` y de dos paneles de `/admin`**

El resto de la web (landing, formulario de inscripción, casi todo `/admin`) es CSS
plano escrito a mano. shadcn/Tailwind se metió *solo* para esta zona. Hay tres cosas
que tienes que respetar o romperás el sitio público:

1. **El "preflight" de Tailwind está desactivado a propósito.** `frontend/src/index.css`
   importa `tailwindcss/theme.css` y `tailwindcss/utilities.css` por separado en vez de
   `@import "tailwindcss"`, justo para no cargar el reset global. Si lo reactivas, el
   reset pisa los estilos de la landing y se descuadra toda la web pública.
2. **Las clases de Tailwind solo funcionan dentro de `.shadcn-scope`.** shadcn escribe
   6 nombres de token que ya usaba `tokens.css` (`--color-primary`, `--color-background`,
   `--color-border`, `--radius-lg/md/xl`). Para que no se pisen, `tokens.css` gana en
   `:root` y la clase `.shadcn-scope` vuelve a enlazar esos 6 nombres a los de shadcn
   dentro de su subárbol. `/equipo` va envuelto en `shadcn-scope dark`.
3. **No toques `landing.css`, `home.css` ni el resto de `admin.css`.** Si necesitas un
   estilo nuevo para `/equipo`, ponlo en `equipo.css` o resuélvelo con clases de Tailwind.

Componentes de shadcn ya instalados en `frontend/src/components/ui/`: `button`, `card`,
`badge`, `tabs`, `input`, `label`, `select`, `checkbox`, `calendar`, `dialog`,
`alert-dialog`. Para añadir otro: `cd frontend && npx shadcn@latest add <componente>`.

## Los datos que tienes disponibles

`GET /api/equipo/session` (la llama `EquipoPage` al cargar):

```json
{ "ok": true, "authenticated": true,
  "teams": ["marketing", "eventos"],   // departamentos de esa persona
  "vp_de": ["marketing"],              // subconjunto de teams donde es VP
  "cargo": "presidente" }              // "presidente" | "boardmember" | ""
```

`GET /api/equipo/calendario` (requiere sesión de equipo):

```json
{ "ok": true, "eventos": [
  { "id": 1, "titulo": "Reunión", "descripcion": "...", "fecha": "2026-10-01", "hora": "18:30" }
] }
```

Reglas de acceso ya implementadas en el backend (no hay que replicarlas en el front):

- Departamentos válidos: `marketing`, `eventos`, `ingenieria`.
- `marketing` y `eventos` tienen workspace propio con los mismos paneles: en el
  backend es **el mismo blueprint registrado dos veces** (`/api/marketing` y
  `/api/eventos`, ver `app.py`), y `departamento_actual()` acota cada consulta.
  Para añadir un tercer departamento con tablero basta registrarlo otra vez y
  añadirlo a `_DEPARTAMENTO_POR_BLUEPRINT`.
- Quien tenga `ingenieria`, o `cargo` de `presidente`/`boardmember`, recibe además
  sesión de administrador y puede entrar a `/admin`.
- Un acceso vale con departamento(s) **o** con cargo: el board sin departamento
  es válido, y entra directo a `/admin`.
- Las altas de personas y el calendario se gestionan desde `/admin` (paneles
  `EquipoAccesosPanel` y `CalendarioPanel`), no desde `/equipo`.

**No hace falta que toques nada de `backend/`** para rediseñar la UI: todo lo que
necesitas ya lo devuelven esos dos endpoints.

## Levantarlo en local

```bash
# 1. Base de datos
docker run -d --name teleco-pg -e POSTGRES_USER=telecoemprende \
  -e POSTGRES_PASSWORD=telecoemprende -e POSTGRES_DB=telecoemprende -p 5432:5432 postgres:16-alpine

# 2. Backend (raíz del repo, necesita el .env con ADMIN_PASSWORD y FLASK_SECRET_KEY)
python app.py            # :5000

# 3. Frontend
cd frontend && npm install && npm run dev    # :5173, proxya /api al backend
```

Después entra en `http://localhost:5173/admin`, crea una persona en la sección
"Accesos de equipo" marcándole los departamentos que quieras probar, y entra con
ella en `http://localhost:5173/equipo` (en incógnito, para no pisar tu sesión de
admin).

## Antes de dar por terminado

```bash
cd frontend
npx tsc --noEmit -p .   # tipos
npm test                # 25 tests (Marketing y Eventos incluidos)
npm run build           # que compile de verdad
```

Y mira `/` y `/admin` a ojo para confirmar que la web pública sigue igual: es el
riesgo real de tocar esta zona.
