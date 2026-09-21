import { motion, useReducedMotion } from "motion/react";

import { SPRING_DEFAULT } from "@/components/smoothui/lib/animation";

type AlertBannerProps = {
  variant: "info" | "success" | "error";
  message: string;
  /** Botón inline opcional, p. ej. "Deshacer" tras una acción reversible. */
  action?: { label: string; onClick: () => void };
};

export function AlertBanner({ variant, message, action }: AlertBannerProps) {
  const menos = useReducedMotion();
  return (
    <motion.div
      className={`alert-banner alert-${variant}`}
      // Entra empujando un poco desde arriba: el aviso aparece donde no había
      // nada, y sin ese gesto es fácil no enterarse de que ha salido.
      initial={menos ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={menos ? { duration: 0 } : SPRING_DEFAULT}
    >
      <span>{message}</span>
      {action ? (
        <button type="button" className="alert-banner__accion" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </motion.div>
  );
}
