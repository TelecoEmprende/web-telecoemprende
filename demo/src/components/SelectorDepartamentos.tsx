import type { FichaDepartamento } from '../data/contenido'
import { IconoFlecha } from './Iconos'
import { iconoDeDepartamento } from './iconosDepartamento'

type Props = {
  /** En el orden en el que se enseñan; el test lo cambia. */
  departamentos: FichaDepartamento[]
  /** Departamento marcado ahora mismo, o null si aún no se ha elegido ninguno. */
  activo: FichaDepartamento['id'] | null
  onElegir: (id: FichaDepartamento['id']) => void
}

/*
 * Las tres puertas de entrada.
 *
 * En la feria: terminas el test hablado y tocas el departamento que le toca.
 * La página baja hasta ahí y ese departamento se queda marcado mientras
 * se recorre el resto.
 *
 * Son enlaces de verdad, no botones, para que cada departamento tenga su
 * propia dirección: el club puede dejar /#tech, /#marketing y /#eventos como
 * accesos directos en la tablet y abrir por el apartado que toque sin
 * desplazarse. De paso funcionan el botón atrás y abrir en pestaña nueva.
 */
export function SelectorDepartamentos({ departamentos, activo, onElegir }: Props) {
  return (
    <nav className="selector" aria-label="Departamentos del club">
      {departamentos.map((depto) => {
        const Icono = iconoDeDepartamento[depto.id]
        const estaActivo = activo === depto.id

        return (
          <a
            key={depto.id}
            className="selector__fila"
            href={`#${depto.id}`}
            aria-current={estaActivo}
            onClick={() => onElegir(depto.id)}
          >
            <Icono className="selector__icono" />

            <span className="selector__cuerpo">
              <span className="selector__nombre">{depto.nombre}</span>
              <span className="selector__lema">{depto.lema}</span>
              <span className="selector__gancho">{depto.gancho}</span>
            </span>

            <IconoFlecha className="selector__flecha" />
          </a>
        )
      })}
    </nav>
  )
}
