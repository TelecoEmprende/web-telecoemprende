import { createContext, useContext } from 'react'

/*
 * El idioma de la página: tipos, contexto y las funciones para leerlo.
 *
 * Va aparte del proveedor (idioma.tsx) porque un archivo que exporta un
 * componente y además otras cosas rompe el refresco en caliente de Vite: el
 * archivo del componente exporta solo el componente, y esto lo demás.
 */

export type Idioma = 'es' | 'en'

/** Un texto de la página en los dos idiomas. Ver `data/contenido.ts`. */
export type Texto = { es: string; en: string }

export type ValorIdioma = {
  idioma: Idioma
  setIdioma: (idioma: Idioma) => void
}

export const ContextoIdioma = createContext<ValorIdioma | null>(null)

export function useIdioma() {
  const contexto = useContext(ContextoIdioma)
  if (!contexto) throw new Error('useIdioma tiene que usarse dentro de <ProveedorIdioma>.')
  return contexto
}

/*
 * Devuelve la función que saca de cada texto el idioma que toca:
 *
 *   const t = useTexto()
 *   <h1>{t(club.titular)}</h1>
 */
export function useTexto() {
  const { idioma } = useIdioma()
  return (texto: Texto) => texto[idioma]
}

/** Para los textos con huecos: `{n}`, `{total}`, `{que}`... */
export function rellenar(texto: string, huecos: Record<string, string | number>) {
  return Object.entries(huecos).reduce(
    (resultado, [nombre, valor]) => resultado.replaceAll(`{${nombre}}`, String(valor)),
    texto,
  )
}
