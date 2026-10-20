"""Rutas de los registros del workspace.

Cuelgan del mismo blueprint que el resto del departamento (`/api/<depto>/...`),
así que heredan su autorización y su `departamento_actual()` sin montar un
sistema aparte.

Cada entidad declara qué campos acepta y cómo se validan; el CRUD en sí lo
resuelve `_montar_rutas`, que es la misma para todas. Aquí cuelga también
`/plataforma`, que no es un registro pero comparte blueprint y autorización.
"""

from functools import wraps

from flask import jsonify, request

from backend.api.sesion import requiere_sesion
from backend.api.marketing import (
    DEPARTAMENTOS,
    DatosInvalidos,
    _autor,
    _fecha,
    _lista_textos,
    _opcion,
    _payload,
    _texto,
    departamento_actual,
    es_cargo_vp_o_admin,
    marketing_api,
)
from backend.api.notas import contenido_valido
from backend.config import (
    MAX_ENLACES,
    MAX_RESPONSABLES,
    MAX_TEXTO_LARGO_LEN,
    MAX_TITULO_LEN,
)
from backend.schemas import build_response
from backend.services import registros as reg
from backend.services import slack
from backend.services.plataforma import estado_plataforma


def _url(datos: dict, clave: str) -> str:
    """Enlace http(s), o vacío. Lo que acaba en un `<a href>` no puede ser un
    `javascript:` ni un `data:` guardado por alguien del equipo."""
    valor = _texto(datos, clave, maximo=600)
    if valor and not valor.lower().startswith(("http://", "https://")):
        raise DatosInvalidos(f"'{clave}' tiene que empezar por http:// o https://.")
    return valor


def _importe(datos: dict, clave: str) -> str:
    """Importe en euros, validado como número y devuelto como texto.

    Texto y no float: psycopg2 lo entrega tal cual a NUMERIC, y así el valor
    que llega es el que se guarda, sin pasar por binario.
    """
    bruto = str(datos.get(clave, "0")).replace(",", ".").strip() or "0"
    try:
        valor = float(bruto)
    except ValueError:
        raise DatosInvalidos("El importe tiene que ser un número.") from None
    if valor < 0:
        raise DatosInvalidos("El importe no puede ser negativo.")
    if valor > 99_999_999:
        raise DatosInvalidos("El importe se sale de lo que cabe.")
    return f"{valor:.2f}"


# Cada entrada: cómo se lee un campo del JSON. `parcial` marca si la petición
# es un alta (donde el título es obligatorio) o una edición.
def _campos_presupuesto(datos: dict) -> dict:
    salida = {}
    if "concepto" in datos:
        salida["concepto"] = _texto(
            datos, "concepto", obligatorio=True, maximo=MAX_TITULO_LEN
        )
    if "tipo" in datos:
        salida["tipo"] = _opcion(datos, "tipo", reg.PRESUPUESTO_TIPOS, "gasto")
    if "importe" in datos:
        salida["importe"] = _importe(datos, "importe")
    if "estado" in datos:
        salida["estado"] = _opcion(datos, "estado", reg.PRESUPUESTO_ESTADOS, "previsto")
    if "fecha" in datos:
        salida["fecha"] = _fecha(datos, "fecha")
    if "notas" in datos:
        salida["notas"] = _texto(datos, "notas", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True)
    return salida


def _campos_reunion(datos: dict) -> dict:
    salida = {}
    if "titulo" in datos:
        salida["titulo"] = _texto(datos, "titulo", obligatorio=True, maximo=MAX_TITULO_LEN)
    if "fecha" in datos:
        salida["fecha"] = _fecha(datos, "fecha")
    if "hora" in datos:
        salida["hora"] = _texto(datos, "hora", maximo=5)
    if "objetivo" in datos:
        salida["objetivo"] = _texto(
            datos, "objetivo", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True
        )
    if "asistentes" in datos:
        salida["asistentes"] = _lista_textos(datos, "asistentes", MAX_ENLACES)
    if "contenido" in datos:
        salida["contenido"] = contenido_valido(datos["contenido"])
    if datos.get("club"):
        # Reunión de todo el club (no de un departamento): la lee `crear`.
        salida["club"] = True
    if datos.get("directiva"):
        # Reunión de la directiva: también la lee `crear`.
        salida["directiva"] = True
    if "solo_directiva" in datos:
        salida["solo_directiva"] = bool(datos.get("solo_directiva"))
    return salida


def _campos_servicio(datos: dict) -> dict:
    salida = {}
    if "nombre" in datos:
        salida["nombre"] = _texto(datos, "nombre", obligatorio=True, maximo=120)
    if "tipo" in datos:
        salida["tipo"] = _opcion(datos, "tipo", reg.SERVICIO_TIPOS, "otro")
    if "url" in datos:
        salida["url"] = _url(datos, "url")
    if "responsables" in datos:
        salida["responsables"] = _lista_textos(datos, "responsables", MAX_RESPONSABLES)
    if "renovacion" in datos:
        salida["renovacion"] = _fecha(datos, "renovacion")
    if "estado" in datos:
        salida["estado"] = _opcion(datos, "estado", reg.SERVICIO_ESTADOS, "activo")
    if "notas" in datos:
        salida["notas"] = _texto(datos, "notas", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True)
    if "visible_club" in datos:
        salida["visible_club"] = bool(datos.get("visible_club"))
    return salida


def _solo_cargo_o_admin(func):
    """Además de ser del departamento: cargo, VP o admin (Presupuesto)."""

    @wraps(func)
    def envoltorio(*args, **kwargs):
        if not es_cargo_vp_o_admin():
            return jsonify(build_response(False, "No autorizado.")), 403
        return func(*args, **kwargs)

    return envoltorio


def _montar_rutas(
    ruta: str, tabla: reg.Tabla, leer_campos, obligatorio: str, solo_cargo: bool = False,
    al_crear=None,
):
    """Las cuatro rutas CRUD de una entidad.

    `obligatorio` es el campo sin el cual el alta no tiene sentido (el título,
    el concepto, el nombre): se comprueba aquí y no dentro de cada lector para
    que editar solo un campo suelto siga siendo posible.
    """
    depto_de = departamento_actual

    def listar():
        # `?deptos=marketing,eventos`: varios a la vez en una sola petición.
        deptos = [d for d in request.args.get("deptos", "").split(",") if d]
        if any(d not in DEPARTAMENTOS for d in deptos):
            raise DatosInvalidos("Departamento no válido.")
        filas = reg.listar(tabla, deptos or depto_de(), es_cargo_vp_o_admin())
        return jsonify({"ok": True, ruta: filas}), 200

    def crear():
        datos = _payload()
        campos = leer_campos(datos)
        if obligatorio not in campos:
            raise DatosInvalidos(f"Falta «{obligatorio}».")
        directiva = es_cargo_vp_o_admin()
        # Solo las reuniones traen `club` y `directiva`: no son de un departamento.
        if campos.pop("directiva", False):
            if not directiva:
                return jsonify(build_response(False, "Solo la directiva convoca sus reuniones.")), 403
            departamento = "directiva"
            campos.setdefault("solo_directiva", True)
        else:
            departamento = "" if campos.pop("club", False) else depto_de()
            # «Solo la directiva» es de las reuniones de directiva.
            campos.pop("solo_directiva", None)
        fila = reg.crear(tabla, campos, _autor(), departamento)
        if al_crear is not None:
            al_crear(fila, _autor())
        return jsonify(build_response(True, "Creado.", registro=fila)), 201

    def actualizar(fila_id: int):
        datos = _payload()
        campos = leer_campos(datos)
        campos.pop("club", None)
        campos.pop("directiva", None)
        directiva = es_cargo_vp_o_admin()
        if not directiva:
            # No puede tocar una de directiva (las excluye `_alcance`), y
            # marcar otra como privada no tiene sentido.
            campos.pop("solo_directiva", None)
        if tabla is reg.REUNIONES and "departamento" in datos:
            # Cambiar «de quién es» una reunión ya creada: un departamento,
            # todo el club ('') o la directiva (solo la directiva la hace suya).
            nuevo = str(datos["departamento"] or "")
            if nuevo not in ("", "directiva", *DEPARTAMENTOS):
                raise DatosInvalidos("Ese ámbito no existe.")
            if nuevo == "directiva" and not directiva:
                return jsonify(build_response(False, "Solo la directiva convoca sus reuniones.")), 403
            campos["departamento"] = nuevo
            if nuevo != "directiva":
                # «Solo la ve la directiva» es solo de las suyas (CHECK de la 0014).
                campos["solo_directiva"] = False
        if not campos:
            raise DatosInvalidos("No hay nada que actualizar.")
        if not reg.actualizar(tabla, fila_id, campos, depto_de(), directiva):
            return jsonify(build_response(False, "No encontrado.")), 404
        return jsonify(build_response(True, "Actualizado.")), 200

    def eliminar(fila_id: int):
        if not reg.eliminar(tabla, fila_id, depto_de(), _autor(), es_cargo_vp_o_admin()):
            return jsonify(build_response(False, "No encontrado.")), 404
        return jsonify(build_response(True, "Eliminado.")), 200

    # Nombres únicos por entidad: Flask registra los endpoints por nombre de
    # función, y las cinco entidades comparten estas cuatro de aquí arriba.
    for metodo, func, sufijo, con_id in (
        ("GET", listar, "listar", False),
        ("POST", crear, "crear", False),
        ("PUT", actualizar, "actualizar", True),
        ("DELETE", eliminar, "eliminar", True),
    ):
        func.__name__ = f"api_{ruta}_{sufijo}"
        url = f"/{ruta}/<int:fila_id>" if con_id else f"/{ruta}"
        if solo_cargo:
            func = _solo_cargo_o_admin(func)
        marketing_api.route(url, methods=[metodo])(requiere_sesion(func))


_montar_rutas("presupuesto", reg.PRESUPUESTO, _campos_presupuesto, "concepto", solo_cargo=True)
_montar_rutas("reuniones", reg.REUNIONES, _campos_reunion, "titulo", al_crear=slack.reunion_convocada)
_montar_rutas("servicios", reg.SERVICIOS, _campos_servicio, "nombre")


@marketing_api.route("/presupuesto/resumen", methods=["GET"])
@requiere_sesion
@_solo_cargo_o_admin
def api_presupuesto_resumen():
    return jsonify({"ok": True, "resumen": reg.resumen_presupuesto(departamento_actual())}), 200


@marketing_api.route("/plataforma", methods=["GET"])
@requiere_sesion
def api_plataforma():
    """Estado del despliegue y de las integraciones. Solo Ingeniería: las
    rutas cuelgan del blueprint de los tres departamentos, y esto no es cosa
    de Marketing ni de Eventos."""
    if departamento_actual() != "ingenieria":
        return jsonify(build_response(False, "No encontrado.")), 404
    return jsonify({"ok": True, **estado_plataforma()}), 200
