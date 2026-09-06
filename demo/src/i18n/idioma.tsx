import { useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ContextoIdioma, type Idioma } from './texto'

/*
 * El idioma de la página.
 *
 * A la feria de clubes vienen erasmus, así que la demo se lee en español o en
 * inglés. Es el mismo mecanismo que la web del club
 * (frontend/src/i18n/LanguageContext.tsx), copiado y no importado porque la
 * demo es un proyecto Vite aparte y no comparte el src con ella.
 *
 * Sí comparte la clave de `localStorage`, y eso es aposta: /demo va en el
 * mismo dominio que telecoemprende.es, así que quien ya eligió inglés en la
 * web del club abre esta página directamente en inglés.
 */

const CLAVE = 'teleco-language'

function idiomaGuardado(): Idioma {
  try {
    return window.localStorage.getItem(CLAVE) === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

export function ProveedorIdioma({ children }: { children: ReactNode }) {
  const [idioma, setEstado] = useState<Idioma>(idiomaGuardado)

  useEffect(() => {
    // El <html lang> tiene que decir la verdad: de él dependen la voz con la
    // que lee un lector de pantalla y la partición de palabras.
    document.documentElement.lang = idioma

    try {
      window.localStorage.setItem(CLAVE, idioma)
    } catch {
      // Modo privado o localStorage bloqueado: el idioma dura esta pestaña.
    }
  }, [idioma])

  function setIdioma(siguiente: Idioma) {
    const hayTransiciones = 'startViewTransition' in document
    const quietud = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Sin esto la página entera cambia de golpe. La View Transitions API hace
    // un fundido nativo entre el antes y el después, igual que en la web del
    // club.
    if (!hayTransiciones || quietud) {
      setEstado(siguiente)
      return
    }

    // `flushSync` obliga a React a aplicar el cambio antes de que termine el
    // callback: la API espera el DOM ya actualizado y, si no, aborta.
    const transicion = (
      document as Document & {
        startViewTransition: (callback: () => void) => { ready: Promise<void> }
      }
    ).startViewTransition(() => flushSync(() => setEstado(siguiente)))

    // El navegador puede saltarse la transición y rechazar `ready`; el idioma
    // ya ha cambiado igual, solo se pierde el fundido esa vez.
    transicion.ready.catch(() => {})
  }

  return (
    <ContextoIdioma.Provider value={{ idioma, setIdioma }}>{children}</ContextoIdioma.Provider>
  )
}
