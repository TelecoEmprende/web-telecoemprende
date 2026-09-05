import { marketing, rutaImagen } from '../data/contenido'
import type { Imagen } from '../data/contenido'
import { CabeceraDepartamento } from './CabeceraDepartamento'
import { Figura } from './Figura'
import { Carteles } from './Carteles'
import { Reel } from './Reel'

type Props = {
  onAbrirImagen: (imagen: Imagen) => void
}

/*
 * Marketing / Comms
 *
 * Un tercio de texto y dos tercios de material visual, como el resto de
 * departamentos. Dentro de esos dos tercios van tres bloques —redes, reel y
 * carteles— de la misma altura exacta, para que no queden escalonados unos
 * respecto a otros.
 *
 * Redes y carteles usan el mismo recurso: dos piezas que se pisan en
 * diagonal. Así caben enteras, sin recortar, en el ancho de una columna.
 */
export function SeccionMarketing({ onAbrirImagen }: Props) {
  return (
    <section className="depto depto--marketing" id={marketing.id}>
      <div className="depto__reja">
        <CabeceraDepartamento
          nombre={marketing.nombre}
          gancho={marketing.gancho}
          resumen={marketing.resumen}
        />

        <div className="marketing__visual">
          <div className="redes">
            {/* Las dos capturas se pisan a propósito, como dos móviles
                dejados uno encima del otro. La etiqueta de Instagram va
                encima de su captura y la de LinkedIn debajo de la suya. */}
            {marketing.redes.map((red, indice) => {
              const etiqueta = (
                <figcaption className="red__etiqueta">
                  <a href={red.url} target="_blank" rel="noopener noreferrer">
                    <img src={rutaImagen(red.logo.src)} alt="" width={18} height={18} />
                    {red.usuario}
                  </a>
                </figcaption>
              )

              return (
                <figure className={`red red--${indice + 1}`} key={red.red}>
                  {indice === 0 && etiqueta}
                  <Figura
                    imagen={red.imagen}
                    relacion="9 / 15"
                    className="red__pantalla"
                    onAbrir={onAbrirImagen}
                    espera={`Captura de ${red.red}`}
                  />
                  {indice === 1 && etiqueta}
                </figure>
              )
            })}
          </div>

          <Reel reel={marketing.reel} enlace={marketing.enlaceReel} />

          <Carteles carteles={marketing.carteles} onAbrirImagen={onAbrirImagen} />
        </div>
      </div>

      {marketing.pendiente && (
        <p className="pendiente" role="note">
          {marketing.pendiente}
        </p>
      )}
    </section>
  )
}
