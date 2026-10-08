import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import Magnet from "@/components/reactbits/Magnet";

import { EASE_OUT } from "@/components/smoothui/lib/animation";

/**
 * Movimiento de la landing al hacer scroll. Solo `transform` y `opacity`, una
 * sola vez por elemento, y con `prefers-reduced-motion` todo aparece quieto.
 * (El vocabulario del CRM está en `components/movimiento.tsx`; este es más
 * lento a propósito: aquí se lee, no se trabaja.)
 */

const VISTA = { once: true, margin: "0px 0px -12% 0px" } as const;
const VISIBLE = { opacity: 1, transform: "translateY(0px)" };
const ELEMENTOS = { div: motion.div, p: motion.p, li: motion.li };

type ApareceProps = {
  children: ReactNode;
  className?: string;
  /** Segundos de espera, para escalonar una lista. */
  retraso?: number;
  como?: keyof typeof ELEMENTOS;
  /** Animar al cargar la página, no al entrar en pantalla (lo de arriba del todo). */
  alCargar?: boolean;
};

/** Sube 24 px y se hace visible al entrar en pantalla. */
export function Aparece({ children, className, retraso = 0, como = "div", alCargar = false }: ApareceProps) {
  const menos = useReducedMotion();
  const Elemento = ELEMENTOS[como];
  return (
    <Elemento
      className={className}
      initial={menos ? false : { opacity: 0, transform: "translateY(24px)" }}
      {...(alCargar ? { animate: VISIBLE } : { whileInView: VISIBLE, viewport: VISTA })}
      transition={{ duration: 0.6, ease: EASE_OUT, delay: retraso }}
    >
      {children}
    </Elemento>
  );
}

const TITULAR = { oculto: {}, visible: { transition: { staggerChildren: 0.06 } } };

const PALABRA = {
  oculto: { transform: "translateY(105%)" },
  visible: { transform: "translateY(0%)", transition: { duration: 0.6, ease: EASE_OUT } },
};

type TitularProps = {
  texto: string;
  id?: string;
  className?: string;
};

/**
 * Titular Anton que entra palabra a palabra, cada una desde debajo de su
 * propia máscara. El lector de pantalla lee el `aria-label`, no los trozos.
 */
export function TitularAnimado({ texto, id, className = "in-titular" }: TitularProps) {
  const menos = useReducedMotion();
  const palabras = texto.split(" ");
  return (
    <motion.h2
      id={id}
      className={className}
      aria-label={texto}
      initial={menos ? false : "oculto"}
      whileInView="visible"
      viewport={VISTA}
      variants={TITULAR}
    >
      {palabras.map((palabra, i) => (
        <span key={i} aria-hidden="true">
          <span className="in-mascara">
            <motion.span className="in-mascara-pieza" variants={PALABRA}>
              {palabra}
            </motion.span>
          </span>
          {i < palabras.length - 1 ? " " : null}
        </span>
      ))}
    </motion.h2>
  );
}

/**
 * Un botón que se deja atraer por el cursor (Magnet de React Bits). Sin ratón
 * (móvil) o con reduced motion no se mueve: ahí no hay cursor que seguir.
 */
export function Iman({ children }: { children: ReactNode }) {
  const menos = useReducedMotion();
  const conRaton = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  return (
    <Magnet padding={48} magnetStrength={5} disabled={menos || !conRaton}>
      {children}
    </Magnet>
  );
}
