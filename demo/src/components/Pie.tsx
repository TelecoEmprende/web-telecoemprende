import { club, marketing, rutaImagen } from '../data/contenido'
import type { FichaDepartamento } from '../data/contenido'
import { NombreClub } from './NombreClub'
import { IconoInstagram, IconoLinkedin, IconoRed } from './Iconos'

type Props = {
  /** Los departamentos en el orden en el que se están enseñando. */
  departamentos: FichaDepartamento[]
  onElegir: (id: FichaDepartamento['id']) => void
}

/* Las redes salen de Marketing, que es donde ya están escritas. */
const iconoDeRed: Record<string, typeof IconoRed> = {
  Instagram: IconoInstagram,
  LinkedIn: IconoLinkedin,
}

/*
 * El pie de página.
 *
 * A la izquierda quién somos y cómo escribirnos; a la derecha, arriba, por
 * dónde se puede seguir, y abajo la frase del final. Va sobre tinta para
 * cerrar la página: hasta aquí se ha leído sobre papel, y el cambio dice
 * "esto se ha terminado" sin necesidad de una raya.
 */
export function Pie({ departamentos, onElegir }: Props) {
  return (
    <footer className="pie">
      <div className="pie__club">
        <a className="pie__marca" href={club.web} target="_blank" rel="noopener noreferrer">
          <img src={rutaImagen('/logo.png')} alt="" width={44} height={44} />
          <b>
            <NombreClub />
          </b>
        </a>

        <p className="pie__descripcion">{club.descripcion}</p>

        <a className="pie__correo" href={`mailto:${club.correo}`}>
          {club.correo}
        </a>

        <div className="pie__redes">
          {marketing.redes.map((red) => {
            const Icono = iconoDeRed[red.red] ?? IconoRed
            return (
              <a
                key={red.red}
                className="pie__red"
                href={red.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${red.red} de ${club.nombre}`}
              >
                <Icono className="pie__red-icono" />
              </a>
            )
          })}
        </div>
      </div>

      <nav className="pie__enlaces" aria-label="Enlaces del pie">
        {departamentos.map((depto) => (
          <a
            key={depto.id}
            href={`#${depto.id}`}
            onClick={() => onElegir(depto.id)}
          >
            {depto.nombre}
          </a>
        ))}

        {club.enlacesPie.map((enlace) => (
          <a key={enlace.url} href={enlace.url} target="_blank" rel="noopener noreferrer">
            {enlace.texto}
          </a>
        ))}
      </nav>

      <p className="pie__nota">{club.nota}</p>
    </footer>
  )
}
