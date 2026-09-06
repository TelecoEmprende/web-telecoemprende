import { useIdioma, type Idioma } from '../i18n/texto'

const IDIOMAS: { id: Idioma; etiqueta: string; nombre: string }[] = [
  { id: 'es', etiqueta: 'ES', nombre: 'Español' },
  { id: 'en', etiqueta: 'EN', nombre: 'English' },
]

/*
 * El cambio de idioma, con la misma forma que el de la web del club: dos
 * botones dentro de una pastilla, y el que está puesto en tinta.
 *
 * La etiqueta del grupo va en los dos idiomas ("Idioma / Language") porque
 * quien lo busca todavía no ha cambiado nada: si la etiqueta estuviera solo
 * en español, quien no lo entiende no sabría que esto es lo que anda
 * buscando.
 */
export function SelectorIdioma() {
  const { idioma, setIdioma } = useIdioma()

  return (
    <div className="barra__idioma" role="group" aria-label="Idioma / Language">
      {IDIOMAS.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          lang={opcion.id}
          aria-pressed={idioma === opcion.id}
          aria-label={opcion.nombre}
          onClick={() => setIdioma(opcion.id)}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
