import { useEffect, useRef, useState } from 'react'
import { rutaImagen, type Imagen } from '../data/contenido'
import { IconoImagen } from './Iconos'

type Props = {
  reel: Imagen
  /** Publicación que se abre al pulsarlo. */
  enlace: string
}

/*
 * El reel del club, en bucle y sin sonido.
 *
 * Va silenciado porque los navegadores bloquean el vídeo con sonido que
 * arranca solo, y porque en una feria no se oiría de todas formas.
 *
 * A quien tenga activado el ajuste de "reducir movimiento" no se le arranca
 * solo: se le dan los controles para que lo ponga si quiere. Ese es el único
 * motivo por el que aparecen los controles; que un intento de arranque falle
 * no cuenta, porque se reintenta y porque los controles impedirían pulsar el
 * enlace a Instagram.
 */
export function Reel({ reel, enlace }: Props) {
  const [falla, setFalla] = useState(false)
  const [quietud, setQuietud] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => setQuietud(consulta.matches)

    aplicar()
    consulta.addEventListener('change', aplicar)
    return () => consulta.removeEventListener('change', aplicar)
  }, [])

  // React no fija de forma fiable el atributo `muted` en el DOM, y sin él
  // el navegador bloquea la reproducción automática. Se pone a mano.
  const arrancar = () => {
    const video = videoRef.current
    if (!video || quietud) return

    video.muted = true
    video.play().catch(() => {
      // En silencio: se reintenta en cuanto el vídeo tenga datos.
    })
  }

  /*
   * El navegador para el vídeo cuando sale de pantalla y no lo reanuda solo.
   * Como casi nadie llega a Marketing sin desplazarse antes, sin esto la
   * mayoría vería un fotograma congelado. Se vigila si está a la vista:
   * al entrar arranca, al salir para. Así sus megas tampoco se descargan
   * hasta que el visitante se acerca a la sección.
   */
  useEffect(() => {
    const video = videoRef.current
    if (!video || quietud) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          video.muted = true
          // Con `preload="metadata"` el navegador solo se ha traído la
          // cabecera; el resto se pide aquí, la primera vez que hace falta.
          if (video.readyState === 0) video.load()
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.35 },
    )

    observador.observe(video)
    return () => observador.disconnect()
  }, [quietud])

  if (falla) {
    return (
      <div className="reel">
        <div className="hueco" style={{ aspectRatio: '9 / 16' }}>
          <IconoImagen className="hueco__icono" />
          <p className="hueco__texto">{reel.alt}</p>
          <code className="hueco__archivo">{reel.src.split('/').pop()}</code>
        </div>
      </div>
    )
  }

  const video = (
    <video
      ref={videoRef}
      className="reel__video"
      src={rutaImagen(reel.src)}
      aria-label={reel.alt}
      loop
      muted
      playsInline
      controls={quietud}
      preload="metadata"
      onCanPlay={arrancar}
      onError={() => setFalla(true)}
    />
  )

  // Con los controles puestos, envolverlo en un enlace impediría usarlos.
  if (quietud) return <div className="reel">{video}</div>

  return (
    <a
      className="reel reel--enlace"
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
    >
      {video}
      <span className="reel__pie">Ver en Instagram</span>
    </a>
  )
}
