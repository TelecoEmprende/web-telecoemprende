import type { Imagen } from '../data/contenido'
import { Figura } from './Figura'

type Props = {
  carteles: Imagen[]
  onAbrirImagen: (imagen: Imagen) => void
}

/*
 * Los carteles que diseña el departamento.
 *
 * Se pisan en diagonal, igual que las capturas de las redes. Es la única
 * forma de que quepan los dos **enteros** en el ancho de una columna: si
 * cada uno ocupara todo el ancho, habría que recortarlos para que la
 * columna mantuviera la altura de sus vecinas.
 *
 * Van directos sobre el papel, sin tablón ni marco: la madera y el corcho
 * desentonaban con el azul, el naranja y el papel del resto de la página.
 */
export function Carteles({ carteles, onAbrirImagen }: Props) {
  return (
    <div className="carteles">
      {carteles.map((cartel, indice) => (
        <Figura
          key={cartel.src}
          imagen={cartel}
          relacion="4 / 5"
          className={`cartel cartel--${indice + 1}`}
          onAbrir={onAbrirImagen}
        />
      ))}
    </div>
  )
}
