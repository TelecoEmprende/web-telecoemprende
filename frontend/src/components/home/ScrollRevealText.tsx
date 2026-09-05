import { Fragment, useEffect, useMemo, useRef, useState } from "react";

type ScrollRevealTextProps = {
  text: string;
  className?: string;
};

/**
 * Párrafo cuyas palabras pasan de gris a color de texto conforme se hace
 * scroll (como en goexponential.org). Respeta prefers-reduced-motion.
 */
export function ScrollRevealText({ text, className }: ScrollRevealTextProps) {
  const words = useMemo(() => text.split(" "), [text]);
  const ref = useRef<HTMLParagraphElement>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealedCount(words.length);
      return;
    }

    let frame = 0;

    function updateProgress() {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const start = window.innerHeight * 0.85;
      const end = window.innerHeight * 0.4;
      const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
      setRevealedCount(Math.round(progress * words.length));
    }

    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateProgress);
    }

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [words.length]);

  return (
    <p className={className} ref={ref}>
      {words.map((word, index) => (
        <Fragment key={index}>
          <span className={index < revealedCount ? "lp-reveal-word is-revealed" : "lp-reveal-word"}>
            {word}
          </span>
          {index < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </p>
  );
}
