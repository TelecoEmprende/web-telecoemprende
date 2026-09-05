import { useState } from 'react'
import { rutaImagen, type Imagen } from '../data/contenido'
import { IconoImagen } from './Iconos'

type Props = {
  imagen: Imagen
  /** Se llama al hacer clic, para abrir la imagen a pantalla completa. */
  onAbrir?: (imagen: Imagen) => void
  /** Proporción de la caja: '4 / 3', '16 / 10', '9 / 16'... o 'auto' para
   *  respetar la forma original de la imagen. */
  relacion?: string
  /** Clases extra para colocarla dentro de su sección. */
  className?: string
  /** Texto del hueco cuando la imagen aún no existe. Por defecto, el alt. */
  espera?: string
  /** Si se pasa, pulsar la imagen abre esa dirección en vez de ampliarla. */
  href?: string
}

/*
 * Una imagen de la página.
 *
 * Si el archivo todavía no existe en `public/img/`, en vez de romperse
 * enseña un hueco con el nombre que está esperando. En cuanto dejes el
 * archivo con ese nombre, la imagen aparece sola.
 *
 * Un fallo de red puntual no cuenta como archivo que falta: se reintenta
 * una vez antes de dar la imagen por perdida. En la feria, con wifi malo,
 * la diferencia es entre una foto que tarda y una foto que no vuelve.
 */
export function Figura({
  imagen,
  onAbrir,
  relacion = '4 / 3',
  className = '',
  espera,
  href,
}: Props) {
  // Se guarda junto a la ruta: si la imagen cambia, la cuenta se reinicia
  // sola durante el propio renderizado, sin efectos ni renders de más.
  const [prueba, setPrueba] = useState({ src: imagen.src, intentos: 0 })
  const intentos = prueba.src === imagen.src ? prueba.intentos : 0
  const sinRuta = imagen.src.trim() === ''

  const rendida = intentos >= 2
  const caja = relacion === 'auto' ? undefined : relacion

  if (sinRuta || rendida) {
    const nombreArchivo = imagen.src.split('/').pop() ?? imagen.src

    return (
      <div className={`figura figura--hueco ${className}`}>
        <div className="hueco" style={{ aspectRatio: caja ?? '4 / 3' }}>
          <IconoImagen className="hueco__icono" />
          <p className="hueco__texto">{espera ?? imagen.alt}</p>
          {!sinRuta && <code className="hueco__archivo">{nombreArchivo}</code>}
        </div>
      </div>
    )
  }

  const contenido = (
    <img
        // Al reintentar, la ruta cambia y el navegador vuelve a pedirla
        // en lugar de servir el error que ya tenía guardado.
        src={intentos === 0 ? rutaImagen(imagen.src) : `${rutaImagen(imagen.src)}?reintento=${intentos}`}
        alt={imagen.alt}
        loading="lazy"
        style={{ aspectRatio: caja }}
      onError={() => setPrueba({ src: imagen.src, intentos: intentos + 1 })}
    />
  )

  if (href) {
    return (
      <a
        className={`figura figura__boton figura--enlace ${className}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir: ${imagen.alt}`}
      >
        {contenido}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={`figura figura__boton ${className}`}
      onClick={() => onAbrir?.(imagen)}
      aria-label={`Ver más grande: ${imagen.alt}`}
    >
      {contenido}
    </button>
  )
}
