# Teleco Builders 2026 - Registro de Evento

Formulario de inscripción para **Teleco Builders 2026**, evento de tecnología, emprendimiento e inversión. Backend en Flask, frontend en React, base de datos PostgreSQL.

## Características

- Formulario de inscripción con validaciones en frontend y backend
- Panel de administración con login protegido por contraseña
- Edición y eliminación de registros directamente desde el panel admin (inline)
- Exportación de registros a Excel
- Protección anti bots con honeypot y rate limiting
- Protección contra SQL injection y XSS
- HTTPS con certificados Let's Encrypt (Certbot)
- Meta tags Open Graph y Twitter Card para compartir por WhatsApp y redes sociales

## Stack

- **Backend:** Flask + Gunicorn
- **Frontend:** React + TypeScript + Vite
- **Base de datos:** PostgreSQL 16
- **Servidor web:** Nginx
- **Despliegue:** Docker Compose
- **HTTPS:** Certbot / Let's Encrypt

## Arquitectura

- `frontend`: Nginx sirve el build de React en los puertos 80/443 y reenvía `/api` al backend
- `backend`: Flask con Gunicorn en red interna Docker (puerto 5000)
- `db`: PostgreSQL con volumen persistente (`pgdata`)
- `certbot`: renovación automática de certificados SSL

## Variables de entorno

Crea un archivo `.env` en la raíz con:

```env
ADMIN_PASSWORD=tu_password_seguro
FLASK_SECRET_KEY=una_clave_larga_y_aleatoria
POSTGRES_PASSWORD=otra_clave_segura
CERTBOT_EMAIL=tu@email.com
```

## Despliegue con Docker

```bash
# Levantar todo (primer arranque o tras cambios)
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f

# Parar servicios
docker compose down

# Reconstruir sin caché
docker compose build --no-cache
```

La aplicación queda disponible en `https://tudominio.com` (o `http://localhost` sin SSL).

## Desarrollo local

### Backend

```bash
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

En desarrollo, Vite sirve el frontend en `http://localhost:5173` y hace proxy de `/api` al backend en `http://127.0.0.1:5000`.

## Base de datos

Los registros se guardan en PostgreSQL. Tabla principal: `registrations`.

```bash
# Entrar al cliente de PostgreSQL
docker exec -it formulario-telecoemprende-db-1 psql -U telecoemprende -d telecoemprende

# Ver todos los registros
SELECT * FROM registrations;

# Contar registros
SELECT COUNT(*) FROM registrations;
```

## API Admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/login` | Iniciar sesión |
| `POST` | `/api/admin/logout` | Cerrar sesión |
| `GET` | `/api/admin/session` | Comprobar sesión |
| `GET` | `/api/admin/registrations` | Listar registros |
| `PUT` | `/api/admin/registrations/<id>` | Editar un registro |
| `DELETE` | `/api/admin/registrations/<id>` | Eliminar un registro |
| `GET` | `/api/admin/download` | Descargar Excel |

## Tests

### Backend

```bash
python -m unittest discover -s tests -v
```

### Frontend

```bash
cd frontend
npm test
```
