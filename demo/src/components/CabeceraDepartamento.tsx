import type { Texto } from '../data/contenido'
import { useTexto } from '../i18n/texto'

type Props = {
  nombre: Texto
  gancho: Texto
  resumen: Texto
}

/*
 * El bloque de título y resumen que abre cada departamento.
 * Es lo único que los tres comparten: la parte visual de cada uno es distinta.
 */
export function CabeceraDepartamento({ nombre, gancho, resumen }: Props) {
  const t = useTexto()

  return (
    <div className="cabecera">
      <h2 className="cabecera__nombre">{t(nombre)}</h2>
      <p className="cabecera__gancho">{t(gancho)}</p>
      <p className="cabecera__resumen">{t(resumen)}</p>
    </div>
  )
}
