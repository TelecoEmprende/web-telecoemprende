import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useLanguage } from "../../i18n/LanguageContext";
import { useTranslation } from "../../i18n/translations";

export function LandingNav() {
  const { pathname } = useLocation();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const onHomePage = pathname === "/";
  const toAnchor = (hash: string) => (onHomePage ? hash : `/${hash}`);

  const navLinks = [
    { href: "#quienes-somos", label: t.nav.quienesSomos },
    { href: "#departamentos", label: t.nav.departamentos },
    { href: "#eventos", label: t.nav.eventos },
    { href: "#inscripcion", label: t.nav.inscripcion },
  ];

  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!onHomePage) return;

    const sectionIds = ["inicio", ...navLinks.map((link) => link.href.slice(1))];
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
      <div className="lp-container lp-nav-inner">
        <a href={toAnchor("#inicio")} className="lp-nav-brand">
          <img src="/logo.png" alt="Logo de TelecoEmprende" className="lp-nav-logo" />
          <span className="lp-nav-name">
            Teleco<span>Emprende</span>
          </span>
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
                {link.label}
              </a>
            );
          })}
          <a
            href={toAnchor("#inscripcion")}
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

        <a href={toAnchor("#inscripcion")} className="lp-nav-cta lp-nav-cta-desktop">
          {t.nav.cta}
        </a>
      </div>
    </header>
  );
}
