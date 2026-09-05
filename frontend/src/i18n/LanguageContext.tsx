import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

export type Language = "es" | "en";

const STORAGE_KEY = "teleco-language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Modo privado o localStorage bloqueado: el idioma solo dura la pestaña actual.
    }
  }, [language]);

  function setLanguage(next: Language) {
    const supportsViewTransition = "startViewTransition" in document;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sin esto el texto cambia de golpe: la View Transitions API hace un
    // cross-fade nativo entre el estado antes/después del cambio de idioma,
    // con el mismo tiempo/curva que ya usa el pill del toggle (ver landing.css).
    if (!supportsViewTransition || prefersReducedMotion) {
      setLanguageState(next);
      return;
    }

    // flushSync obliga a React a aplicar el cambio de estado de forma
    // síncrona: la API espera que el DOM ya esté actualizado cuando termina
    // el callback, y sin esto lanza "Transition was aborted" porque React
    // aplica el cambio en un ciclo posterior.
    const transition = (
      document as Document & {
        startViewTransition: (callback: () => void) => { ready: Promise<void> };
      }
    ).startViewTransition(() => flushSync(() => setLanguageState(next)));

    // El navegador puede saltarse la transición (pestaña sin foco, otra
    // transición en curso...) y rechazar `ready`; el idioma ya ha cambiado
    // igualmente, solo se pierde el cross-fade esa vez.
    transition.ready.catch(() => {});
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage debe usarse dentro de <LanguageProvider>.");
  }
  return context;
}
