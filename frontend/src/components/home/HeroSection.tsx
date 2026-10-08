import { ArrowDown, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import RotatingText from "@/components/reactbits/RotatingText";
import { EASE_OUT } from "@/components/smoothui/lib/animation";
import { useTranslation } from "../../i18n/translations";
import { Aparece, Iman } from "./aparece";

/**
 * Sistema gráfico de la guía, sin nada más: plano Azul TE, titular Anton desde
 * el margen izquierdo y un único círculo Impulso que entra desde el borde.
 */
export function HeroSection() {
  const { t } = useTranslation();
  const menos = useReducedMotion();
  const lineas = [t.hero.linea1, t.hero.linea2, t.hero.rotando[0]];

  // Parallax al salir del hero: el círculo baja y crece, el texto sube más despacio.
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const circuloY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const circuloEscala = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const textoY = useTransform(scrollYProgress, [0, 1], ["0px", "-80px"]);

  // Cada línea sube desde debajo de su propia máscara, escalonada.
  const entrada = (i: number) =>
    menos
      ? {}
      : {
          initial: { transform: "translateY(105%)" },
          animate: { transform: "translateY(0%)" },
          transition: { duration: 0.5, ease: EASE_OUT, delay: 0.08 * i },
        };

  return (
    <section className="in-hero" id="inicio" ref={ref}>
      <motion.div
        className="in-hero-circulo"
        aria-hidden="true"
        style={menos ? undefined : { y: circuloY, scale: circuloEscala }}
      >
        <motion.div
          className="in-hero-circulo-forma"
          initial={menos ? false : { opacity: 0, transform: "scale(0.85)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
        />
      </motion.div>

      <motion.div className="in-wrap in-hero-contenido" style={menos ? undefined : { y: textoY }}>
        <h1 className="in-hero-titular">
          {lineas.map((linea, i) => (
            <span className="in-hero-mascara" key={linea}>
              <motion.span className={i === 2 ? "in-hero-linea is-chispa" : "in-hero-linea"} {...entrada(i)}>
                {i === 2 ? (
                  // La última línea va cambiando de verbo, letra a letra (RotatingText de React Bits).
                  <RotatingText
                    texts={t.hero.rotando}
                    auto={!menos}
                    rotationInterval={2800}
                    staggerFrom="last"
                    staggerDuration={0.025}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-120%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    splitLevelClassName="in-rotando-palabra"
                  />
                ) : (
                  linea
                )}
              </motion.span>
            </span>
          ))}
        </h1>

        <Aparece alCargar como="p" className="in-hero-lead" retraso={0.35}>{t.hero.lead}</Aparece>

        <Aparece alCargar className="in-acciones" retraso={0.45}>
          <Iman>
            <a href="#quienes-somos" className="in-btn in-btn-blanco">
              {t.hero.ctaPrimary}
              <ArrowDown aria-hidden size={18} strokeWidth={2.25} />
            </a>
          </Iman>
          <a href="/news" className="in-enlace in-enlace-claro">
            {t.hero.ctaSecondary}
            <ArrowRight aria-hidden size={18} strokeWidth={2.25} />
          </a>
        </Aparece>
      </motion.div>
    </section>
  );
}
