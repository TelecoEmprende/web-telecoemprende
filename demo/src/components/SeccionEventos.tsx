import { eventos } from '../data/contenido'
import type { Imagen } from '../data/contenido'
import { CabeceraDepartamento } from './CabeceraDepartamento'
import { Figura } from './Figura'
import { IconoPlay } from './Iconos'
import { Sello } from './Sello'

type Props = {
  onAbrirImagen: (imagen: Imagen) => void
}

/*
 * Eventos / Logística
 * Resumen a la izquierda; las charlas a la derecha, cada una con el logo de
 * la empresa en un sello que se sale de la esquina.
 *
 * El marco es 3:4 porque es exactamente la proporción de las cuatro fotos:
 * así entran enteras y no se recorta ninguna cara.
 */
export function SeccionEventos({ onAbrirImagen }: Props) {
  return (
    <section className="depto depto--eventos" id={eventos.id}>
      <div className="depto__reja">
        <CabeceraDepartamento
          nombre={eventos.nombre}
          gancho={eventos.gancho}
          resumen={eventos.resumen}
        />

        <div className="charlas">
          {eventos.charlas.map((charla) => (
            <article className="charla" key={charla.imagen.src}>
              <div className="charla__marco">
                <Figura
                  imagen={charla.imagen}
                  relacion="3 / 4"
                  className="charla__imagen"
                  onAbrir={onAbrirImagen}
                />
                {charla.imagen.video && (
                  <span className="charla__play" aria-hidden="true">
                    <IconoPlay />
                  </span>
                )}
                <Sello charla={charla} />
              </div>

              <div className="charla__pie">
                {/* Manda el nombre de la persona; si vino un equipo, la empresa. */}
                <h3 className="charla__quien">{charla.ponente || charla.entidad}</h3>
                {charla.cargo && <p className="charla__cargo">{charla.cargo}</p>}
                {charla.titulo && <p className="charla__tipo">{charla.titulo}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>

      {eventos.pendiente && (
        <p className="pendiente" role="note">
          {eventos.pendiente}
        </p>
      )}
    </section>
  )
}
