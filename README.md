# TelecoEmprende - Registro de Evento

Formulario de inscripción para el evento **TelecoEmprende**. Este proyecto permite a los estudiantes y graduados de telecomunicaciones registrarse para el evento, recibir detalles y obtener un archivo Excel con los registros.

## Características

- **Formulario de inscripción** con campos para nombre, apellidos, estudios y correo electrónico.
- **Validación de datos** para asegurar que la información es correcta.
- **Generación de un archivo Excel** con los registros de todos los participantes.
- **Interfaz de administración** para ver, descargar y gestionar las inscripciones.
- **Protección contra bots** utilizando un campo honeypot y rate limiting.

## Tecnologías

Este proyecto está construido con:

- **Python** (Flask) para el backend.
- **Openpyxl** para manejar el archivo Excel con las inscripciones.
- **React + TypeScript + Vite** para la interfaz de usuario.

## Instrucciones de uso

### 1. Clona este repositorio:

```bash
git clone https://github.com/aaleexxlex/Formulario-TelecoEmprende.git
````

### 2. Instala las dependencias necesarias:

```bash
pip install -r requirements.txt
````
### 3. Ejecuta la aplicación backend:

```bash
python app.py
```

## Desarrollo frontend

El frontend React vive en `frontend/`.

### Instalar dependencias

```bash
cd frontend
npm install
```

### Ejecutar el frontend en desarrollo

```bash
npm run dev
```

El servidor de Vite corre en `http://localhost:5173` y hace proxy de `/api` al backend Flask en `http://127.0.0.1:5000`.

## Producción

Para que Flask sirva la interfaz React, primero hay que generar el build:

```bash
cd frontend
npm run build
```

Después Flask servirá:

- `/` como shell principal de React
- `/admin` como shell del panel React
- `/assets/*` desde `frontend/dist/assets`
- `/api/*` como rutas backend JSON

## Tests

### Backend

```bash
/Users/jorgerodzruigomez/Documents/UPM/Master/telecoEmprende/env-telecoemprende/bin/python -m unittest discover -s tests -v
```

### Frontend

```bash
cd frontend
npm test
```
