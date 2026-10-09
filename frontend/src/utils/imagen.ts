/** Lado mayor de una foto de perfil. La foto se guarda entera, sin recortar
 *  (en muchas la cara no está en el centro): la recortan al pintarla la
 *  tarjeta de la web (`object-position` en `inicio.css`) y los avatares
 *  redondos de /equipo (`object-cover`). 800px cubre la tarjeta de la web a
 *  2x; un JPEG así pesa unos 50-90 KB, por debajo de `MAX_FOTO_LEN`. */
const LADO_MAYOR = 800;

const CALIDAD = 0.82;

/**
 * Reduce la foto que elige la persona para que su lado mayor mida como mucho
 * 800px, sin recortarla ni deformarla, y la devuelve como data URL lista para
 * guardar.
 *
 * Se hace en el navegador a propósito: así lo que viaja por la red son unas
 * decenas de KB en vez de la foto original del móvil, y el servidor solo tiene
 * que validar la forma (ver `_foto` en `backend/api/marketing.py`), no
 * redimensionar.
 */
export async function aFotoPerfil(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  try {
    const escala = Math.min(1, LADO_MAYOR / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no ha dado un canvas 2d.");

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", CALIDAD);
  } finally {
    bitmap.close();
  }
}
