import { useState } from 'react'
import { rutaImagen, type Charla } from '../data/contenido'

/*
 * Monograma de la empresa, para cuando todavía no hay logo.
 * Un nombre de varias palabras da sus iniciales (JME Ventures → JV);
 * uno de una sola palabra da sus tres primeras letras (TaxDown → TAX).
 */
function monograma(entidad: string) {
  const palabras = entidad.trim().split(/\s+/)

  if (palabras.length === 1) return palabras[0].slice(0, 3).toUpperCase()

  return palabras
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase()
}

/*
 * El sello con el logo de la empresa, en la esquina de la foto.
 *
 * Los logos vienen en dos formas muy distintas: unos son cuadrados y otros
 * son tiras alargadas. Dentro de un círculo, una tira alargada quedaría
 * ilegible, así que el sello se mide a sí mismo: cuadrado para los logos
 * cuadrados, alargado para los alargados.
 */
export function Sello({ charla }: { charla: Charla }) {
  const [sinLogo, setSinLogo] = useState(charla.logo.src.trim() === '')
  const [alargado, setAlargado] = useState(false)

  if (sinLogo) {
    return (
      <span className="sello" title={charla.entidad}>
        <span className="sello__monograma">{monograma(charla.entidad)}</span>
      </span>
    )
  }

  return (
    <span className={`sello ${alargado ? 'sello--alargado' : ''}`} title={charla.entidad}>
      <img
        src={rutaImagen(charla.logo.src)}
        alt={charla.logo.alt}
        onError={() => setSinLogo(true)}
        onLoad={(evento) => {
          const { naturalWidth, naturalHeight } = evento.currentTarget
          if (naturalHeight > 0 && naturalWidth / naturalHeight > 1.6) setAlargado(true)
        }}
      />
    </span>
  )
}
