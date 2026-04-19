# TelecoEmprende - Registro de Evento

Formulario de inscripción para el evento TelecoEmprende con backend en Flask y frontend en React.

## Características

- Formulario de inscripción con validaciones
- Panel de administración con login
- Exportación de registros a Excel
- Protección básica anti bots con honeypot y rate limiting

## Stack

- Backend: Flask + Gunicorn
- Frontend: React + TypeScript + Vite
- Servidor web: Nginx
- Despliegue: Docker Compose

## Cómo está montado el despliegue

La aplicación se ejecuta con dos contenedores:

- Frontend: Nginx sirve el build de React y reenvía las peticiones de /api al backend
- Backend: Flask se ejecuta con Gunicorn en una red interna de Docker
- Persistencia: el archivo Excel se guarda en la carpeta local data para no perder registros al reiniciar

### Servicios

- frontend expuesto en el puerto 80
- backend disponible solo dentro de Docker en el puerto 5000

## Arranque con Docker

### 1. Variables opcionales

Puedes definir un archivo .env en la raíz con:

```env
ADMIN_PASSWORD=tu_password_seguro
FLASK_SECRET_KEY=una_clave_larga_y_segura
```

### 2. Levantar todo

```bash
docker compose up --build
```

O en segundo plano:

```bash
docker compose up --build -d
```

La aplicación quedará disponible en:

- http://localhost

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

En desarrollo, Vite sirve el frontend en http://localhost:5173 y hace proxy de /api al backend en http://127.0.0.1:5000.

## Persistencia de datos

Los registros se guardan en:

- data/registros_evento.xlsx

## Comandos útiles

```bash
# parar servicios
docker compose down

# reconstruir imágenes
docker compose build

# ver logs
docker compose logs -f
```

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
