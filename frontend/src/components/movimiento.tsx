import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { EASE_OUT, DURATION, SPRING_DEFAULT } from "@/components/smoothui/lib/animation";

/**
 * El vocabulario de movimiento del CRM (`/equipo` y `/admin`), sobre las
 * constantes de SmoothUI (`components/smoothui/lib/animation.ts`).
 *
 * Reglas que vienen de ahí y que conviene no romper al añadir animaciones
 * nuevas: solo `transform` y `opacity`, 0.2-0.3s, muelle con `bounce` 0.1 (más
 * rebote solo en algo juguetón o arrastrable), y `useReducedMotion` siempre
 * respetado -- quien pide menos movimiento ve el cambio, no el viaje.
 *
 * Aquí no se anima la salida de las filas de una lista a propósito: quitar
 * algo tiene que desaparecer al instante (y los tests cuentan con ello); lo
 * que se anima es la entrada y la recolocación (`layout`).
 */

/** Tope del escalonado: con listas largas, esperar más se nota como lentitud. */
const RETARDO_MAXIMO = 0.18;
const RETARDO_POR_FILA = 0.03;

type PanelProps = {
  /** Cambiar esto vuelve a disparar la entrada: el id de la sección abierta. */
  llave: string;
  children: ReactNode;
  className?: string;
};

/**
 * Entrada de un panel entero al cambiar de sección en el sidebar.
 *
 * Sin `AnimatePresence`: encadenar la salida del panel anterior con la entrada
 * del nuevo (`mode="wait"`) deja 150 ms en los que la sección pedida todavía
 * no está montada -- se nota como que el sidebar no responde, y hace que quien
 * pulse "Tareas" no encuentre el botón de crear hasta pasado ese rato. Cambiar
 * la `llave` remonta y basta: el panel nuevo entra, el viejo se va sin más.
 */
export function PanelAnimado({ llave, children, className }: PanelProps) {
  const menos = useReducedMotion();
  return (
    <motion.div
      key={llave}
      className={className}
      initial={menos ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: menos ? 0 : DURATION.fast, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Las props de movimiento de una fila, para pegárselas a un elemento que ya
 * existe (`motion.button`, `motion.tr`) sin envolverlo en un `div` que
 * rompería el CSS o el HTML de una lista o una tabla.
 */
export function useEntradaDeFila(
  /** `false` para un `<tr>`: `transform` sobre una fila de tabla se comporta
   *  distinto en cada navegador, así que ahí solo se atenúa la opacidad. */
  desplazable = true,
) {
  const menos = useReducedMotion();
  return (indice = 0) => {
    const retardo = Math.min(indice * RETARDO_POR_FILA, RETARDO_MAXIMO);
    if (menos) {
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0 } };
    }
    if (!desplazable) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: DURATION.fast, ease: EASE_OUT, delay: retardo },
      };
    }
    return {
      layout: "position" as const,
      initial: { opacity: 0, transform: "translateY(6px)" },
      animate: { opacity: 1, transform: "translateY(0px)" },
      transition: { ...SPRING_DEFAULT, delay: retardo },
    };
  };
}

type FilaProps = {
  /** Posición en la lista, para escalonar la entrada. */
  indice?: number;
  /** El elemento real: `li` dentro de una lista, `div` en una rejilla. */
  como?: "div" | "li";
  children: ReactNode;
  className?: string;
};

/**
 * Una tarjeta o fila de una lista: entra escalonada y se recoloca sola
 * (`layout`) cuando cambia el orden o el filtro.
 */
export function FilaAnimada({ indice = 0, como = "div", children, className }: FilaProps) {
  const entrada = useEntradaDeFila();
  const Elemento = como === "li" ? motion.li : motion.div;
  return (
    <Elemento className={className} {...entrada(indice)}>
      {children}
    </Elemento>
  );
}

/**
 * Un número que rueda cuando cambia, en vez de saltar de golpe.
 *
 * Va entero, no cifra a cifra: una celda por dígito obliga a `overflow:
 * hidden`, y un `inline-block` recortado deja de alinear por su línea base
 * interna para hacerlo por su borde inferior -- el "83" se subía respecto al
 * "%" de al lado. Así el elemento es uno solo y la línea base es la de
 * siempre. `mode="popLayout"` saca de la caja al número que se va, para que
 * el que entra no lo empuje mientras se cruzan.
 */
export function Contador({ valor, className }: { valor: number | string; className?: string }) {
  const menos = useReducedMotion();
  const texto = String(valor);

  if (menos) return <span className={className}>{texto}</span>;

  return (
    <span
      className={className}
      style={{ position: "relative", display: "inline-block", fontVariantNumeric: "tabular-nums" }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={texto}
          style={{ display: "inline-block" }}
          initial={{ opacity: 0, transform: "translateY(0.4em)" }}
          animate={{ opacity: 1, transform: "translateY(0em)" }}
          exit={{ opacity: 0, transform: "translateY(-0.4em)" }}
          transition={SPRING_DEFAULT}
        >
          {texto}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
