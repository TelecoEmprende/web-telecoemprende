type Props = {
  nombre: string
  gancho: string
  resumen: string
}

/*
 * El bloque de título y resumen que abre cada departamento.
 * Es lo único que los tres comparten: la parte visual de cada uno es distinta.
 */
export function CabeceraDepartamento({ nombre, gancho, resumen }: Props) {
  return (
    <div className="cabecera">
      <h2 className="cabecera__nombre">{nombre}</h2>
      <p className="cabecera__gancho">{gancho}</p>
      <p className="cabecera__resumen">{resumen}</p>
    </div>
  )
}
