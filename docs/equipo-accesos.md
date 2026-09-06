# Altas en `equipo_accesos`

**Ahora hay UI**: desde `/admin`, sección "Accesos de equipo (/equipo)", se puede
crear gente, cambiarle los equipos, activarla/desactivarla y eliminarla. Los
equipos válidos son `marketing`, `eventos` e `ingenieria` — quien tenga
`ingenieria` recibe también sesión de administrador al iniciar sesión en
`/equipo` (ver `EQUIPO_CON_PERMISOS_ADMIN` en `backend/config.py`).

Lo de abajo queda como referencia / vía de escape manual si hiciera falta
tocar la tabla directamente por SQL contra la misma Postgres que usa
`DATABASE_URL`.

## 1. Generar el hash de la contraseña

Desde un shell de Python con el venv del proyecto activado:

```python
from werkzeug.security import generate_password_hash
generate_password_hash("la-contraseña-elegida")
# 'scrypt:32768:8:1$....'  <- copia este valor completo
```

## 2. Insertar la fila

`equipos` es un array de Postgres; los valores válidos son `marketing` y `eventos`
(puede pertenecer a los dos). La tabla se crea sola en el primer login
(`init_equipo_db()`), pero también puedes ejecutar el `CREATE TABLE IF NOT EXISTS`
de `backend/services/equipo.py` a mano si prefieres darla de alta antes.

Miembro solo de marketing:

```sql
INSERT INTO equipo_accesos (email, password_hash, equipos)
VALUES (
    'marketing.persona@example.com',
    'scrypt:32768:8:1$....',
    ARRAY['marketing']
);
```

Miembro solo de eventos:

```sql
INSERT INTO equipo_accesos (email, password_hash, equipos)
VALUES (
    'eventos.persona@example.com',
    'scrypt:32768:8:1$....',
    ARRAY['eventos']
);
```

Miembro de ambos equipos: `ARRAY['marketing', 'eventos']`.

## 3. Dar de baja / reactivar

No borres la fila si solo quieres quitarle el acceso temporalmente: pon `activo = FALSE`.

```sql
UPDATE equipo_accesos SET activo = FALSE WHERE email = 'marketing.persona@example.com';
```
