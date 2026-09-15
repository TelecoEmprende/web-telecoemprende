/** Lado máximo de una foto de perfil. El avatar más grande que se pinta es el
 *  de la ficha (~72px); 256 cubre pantallas a 3x sin guardar un JPEG de 4 MB
 *  del carrete en una columna de base de datos. */
const LADO = 256;

const CALIDAD = 0.82;

/**
 * Reduce la foto que elige la persona a un cuadrado de 256px y la devuelve
 * como data URL lista para guardar.
 *
 * Se hace en el navegador a propósito: así lo que viaja por la red son ~15 KB
 * en vez de la foto original del móvil, y el servidor solo tiene que validar
 * la forma (ver `_foto` en `backend/api/marketing.py`), no redimensionar.
 *
 * Recorta al cuadrado desde el centro en vez de deformar: un avatar redondo
 * con una cara estirada se nota más que uno con los hombros cortados.
 */
export async function aAvatarCuadrado(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  try {
    const lado = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = LADO;
    canvas.height = LADO;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no ha dado un canvas 2d.");

    ctx.drawImage(
      bitmap,
      (bitmap.width - lado) / 2,
      (bitmap.height - lado) / 2,
      lado,
      lado,
      0,
      0,
      LADO,
      LADO,
    );
    return canvas.toDataURL("image/jpeg", CALIDAD);
  } finally {
    bitmap.close();
  }
}
