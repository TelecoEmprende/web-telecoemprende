import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, useReducedMotion, useScroll } from "motion/react";

import { SPRING_DEFAULT } from "@/components/smoothui/lib/animation";

import { useLanguage } from "../../i18n/LanguageContext";
import { useTranslation } from "../../i18n/translations";

export function LandingNav() {
  const { pathname } = useLocation();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menos = useReducedMotion();
  // Barra de lectura: cuánto llevas de página, pegada al borde inferior de la nav.
  const { scrollYProgress } = useScroll();
  const onHomePage = pathname === "/";
  const toAnchor = (hash: string) => (onHomePage ? hash : `/${hash}`);

  const navLinks = [
    { href: "#quienes-somos", label: t.nav.quienesSomos },
    { href: "#departamentos", label: t.nav.departamentos },
    { href: "#eventos", label: t.nav.eventos },
    { href: "#recursos", label: t.nav.recursos },
    { href: "#equipo", label: t.nav.equipo },
  ];

  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!onHomePage) return;

    // "noticias" y "comunidad" no tienen enlace de ancla: se observan para que, sobre ellas, no quede marcada otra.
    const sectionIds = ["inicio", ...navLinks.map((link) => link.href.slice(1)), "noticias", "comunidad"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        setActiveSection(topMost.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [onHomePage]);

  return (
    <header className="lp-nav">
      <motion.div className="lp-nav-progreso" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
      <div className="lp-container lp-nav-inner">
        <a href={toAnchor("#inicio")} className="lp-nav-brand">
          <img src="/logo-blanco.png" alt="Logo de TelecoEmprende" className="lp-nav-logo" />
          <span className="lp-nav-name">TelecoEmprende</span>
        </a>

        <nav
          className={`lp-nav-links${menuOpen ? " is-open" : ""}`}
          aria-label={t.nav.sectionsLabel}
        >
          {navLinks.map((link) => {
            const isActive = onHomePage && link.href.slice(1) === activeSection;
            return (
              <a
                key={link.href}
                href={toAnchor(link.href)}
                className={isActive ? "is-active" : undefined}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {/* Una sola pastilla que se desliza de un enlace a otro (layoutId). */}
                {isActive && <motion.span layoutId="lp-nav-pastilla" className="lp-nav-pastilla" transition={menos ? { duration: 0 } : SPRING_DEFAULT} />}
                <span className="lp-nav-texto">{link.label}</span>
              </a>
            );
          })}
          <a
            href="/news"
            className={pathname === "/news" ? "is-active" : undefined}
            aria-current={pathname === "/news" ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {t.nav.noticias}
          </a>
          <a
            href={toAnchor("#comunidad")}
            className="lp-nav-cta lp-nav-cta-mobile"
            onClick={() => setMenuOpen(false)}
          >
            {t.nav.cta}
          </a>
        </nav>

        <div
          className={`lp-lang-toggle lp-lang-toggle-${language}`}
          role="group"
          aria-label="Language / Idioma"
        >
          <button
            type="button"
            className={language === "es" ? "active" : undefined}
            aria-pressed={language === "es"}
            onClick={() => setLanguage("es")}
          >
            ES
          </button>
          <button
            type="button"
            className={language === "en" ? "active" : undefined}
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          className={`lp-nav-toggle${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <a href={toAnchor("#comunidad")} className="lp-nav-cta lp-nav-cta-desktop">
          {t.nav.cta}
        </a>
      </div>
    </header>
  );
}
