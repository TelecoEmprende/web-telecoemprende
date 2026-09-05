import { useEffect, useRef } from 'react'
import { rutaImagen, type Imagen } from '../data/contenido'
import { IconoCerrar } from './Iconos'

type Props = {
  imagen: Imagen | null
  onCerrar: () => void
}

/** Saca el identificador de una dirección de YouTube, en sus dos formatos. */
function idDeYoutube(url: string) {
  const largo = url.match(/[?&]v=([\w-]{6,})/)
  if (largo) return largo[1]

  const corto = url.match(/youtu\.be\/([\w-]{6,})/)
  return corto ? corto[1] : null
}

/*
 * Enseña una imagen a pantalla completa cuando alguien la toca, o el vídeo
 * de la charla si esa foto tiene uno.
 *
 * El reproductor de YouTube solo se carga al abrirlo, nunca al cargar la
 * página: son cientos de kilobytes que en una feria no se pagan por algo
 * que quizá nadie pulse.
 *
 * Se cierra con Escape, con el botón o tocando fuera.
 */
export function Visor({ imagen, onCerrar }: Props) {
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!imagen) return

    // Se recuerda desde dónde se abrió para devolver el foco al cerrar.
    const origen = document.activeElement as HTMLElement | null

    cerrarRef.current?.focus()
    document.body.style.overflow = 'hidden'

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        onCerrar()
        return
      }

      // El foco no se escapa detrás del visor: solo hay un control fuera
      // del reproductor, así que el tabulador se queda en él.
      if (evento.key === 'Tab') {
        evento.preventDefault()
        cerrarRef.current?.focus()
      }
    }
    document.addEventListener('keydown', alPulsar)

    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = ''
      origen?.focus()
    }
  }, [imagen, onCerrar])

  if (!imagen) return null

  const idVideo = imagen.video ? idDeYoutube(imagen.video) : null

  return (
    <div
      className="visor"
      role="dialog"
      aria-modal="true"
      aria-label={imagen.alt}
      onClick={onCerrar}
    >
      <button ref={cerrarRef} type="button" className="visor__cerrar" onClick={onCerrar}>
        <IconoCerrar />
        <span>Cerrar</span>
      </button>

      <figure className="visor__marco" onClick={(evento) => evento.stopPropagation()}>
        {idVideo ? (
          <div className="visor__video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${idVideo}?autoplay=1&rel=0`}
              title={imagen.alt}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <img src={rutaImagen(imagen.src)} alt={imagen.alt} />
        )}
        <figcaption>{imagen.alt}</figcaption>
      </figure>
    </div>
  )
}
