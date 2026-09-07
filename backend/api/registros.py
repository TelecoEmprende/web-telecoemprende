"""Rutas de los registros del workspace.

Cuelgan del mismo blueprint que el resto del departamento (`/api/<depto>/...`),
así que heredan su autorización y su `departamento_actual()` sin montar un
sistema aparte.

Cada entidad declara qué campos acepta y cómo se validan; el CRUD en sí lo
resuelve `_montar_rutas`, que es la misma para las cinco.
"""

from flask import jsonify, request

from backend.api.marketing import (
    DatosInvalidos,
    _autor,
    _fecha,
    _lista_textos,
    _opcion,
    _payload,
    _texto,
    departamento_actual,
    marketing_api,
    requiere_equipo,
)
from backend.config import MAX_ENLACES, MAX_TEXTO_LARGO_LEN, MAX_TITULO_LEN
from backend.schemas import build_response
from backend.services import registros as reg


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
def _campos_recurso(datos: dict) -> dict:
    salida = {}
    if "titulo" in datos:
        salida["titulo"] = _texto(datos, "titulo", obligatorio=True, maximo=MAX_TITULO_LEN)
    if "tipo" in datos:
        salida["tipo"] = _opcion(datos, "tipo", reg.RECURSO_TIPOS, "enlace")
    if "url" in datos:
        salida["url"] = _texto(datos, "url", maximo=600)
    if "notas" in datos:
        salida["notas"] = _texto(datos, "notas", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True)
    return salida


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


def _campos_anuncio(datos: dict) -> dict:
    salida = {}
    if "titulo" in datos:
        salida["titulo"] = _texto(datos, "titulo", obligatorio=True, maximo=MAX_TITULO_LEN)
    if "cuerpo" in datos:
        salida["cuerpo"] = _texto(
            datos, "cuerpo", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True
        )
    if "fijado" in datos:
        salida["fijado"] = bool(datos.get("fijado"))
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
    if "acta" in datos:
        salida["acta"] = _texto(datos, "acta", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True)
    return salida


def _campos_alumni(datos: dict) -> dict:
    salida = {}
    if "nombre" in datos:
        salida["nombre"] = _texto(datos, "nombre", obligatorio=True, maximo=120)
    for clave, maximo in (
        ("promocion", 20), ("empresa", 120), ("puesto", 120),
        ("email", 120), ("linkedin", 600),
    ):
        if clave in datos:
            salida[clave] = _texto(datos, clave, maximo=maximo)
    if "estado" in datos:
        salida["estado"] = _opcion(datos, "estado", reg.ALUMNI_ESTADOS, "pendiente")
    if "notas" in datos:
        salida["notas"] = _texto(datos, "notas", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True)
    return salida


def _montar_rutas(ruta: str, tabla: reg.Tabla, leer_campos, obligatorio: str):
    """Las cuatro rutas CRUD de una entidad.

    `obligatorio` es el campo sin el cual el alta no tiene sentido (el título,
    el concepto, el nombre): se comprueba aquí y no dentro de cada lector para
    que editar solo un campo suelto siga siendo posible.
    """
    depto_de = lambda: departamento_actual() if tabla.por_departamento else None  # noqa: E731

    def listar():
        reg.init_registros_db()
        return jsonify({"ok": True, ruta: reg.listar(tabla, depto_de())}), 200

    def crear():
        reg.init_registros_db()
        datos = _payload()
        campos = leer_campos(datos)
        if obligatorio not in campos:
            raise DatosInvalidos(f"Falta «{obligatorio}».")
        fila = reg.crear(tabla, campos, _autor(), depto_de())
        return jsonify(build_response(True, "Creado.", registro=fila)), 201

    def actualizar(fila_id: int):
        reg.init_registros_db()
        campos = leer_campos(_payload())
        if not campos:
            raise DatosInvalidos("No hay nada que actualizar.")
        if not reg.actualizar(tabla, fila_id, campos, depto_de()):
            return jsonify(build_response(False, "No encontrado.")), 404
        return jsonify(build_response(True, "Actualizado.")), 200

    def eliminar(fila_id: int):
        reg.init_registros_db()
        if not reg.eliminar(tabla, fila_id, depto_de()):
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
        marketing_api.route(url, methods=[metodo])(requiere_equipo(func))


_montar_rutas("recursos", reg.RECURSOS, _campos_recurso, "titulo")
_montar_rutas("presupuesto", reg.PRESUPUESTO, _campos_presupuesto, "concepto")
_montar_rutas("anuncios", reg.ANUNCIOS, _campos_anuncio, "titulo")
_montar_rutas("reuniones", reg.REUNIONES, _campos_reunion, "titulo")
_montar_rutas("alumni", reg.ALUMNI, _campos_alumni, "nombre")


@marketing_api.route("/presupuesto/resumen", methods=["GET"])
@requiere_equipo
def api_presupuesto_resumen():
    reg.init_registros_db()
    return jsonify({"ok": True, "resumen": reg.resumen_presupuesto(departamento_actual())}), 200
