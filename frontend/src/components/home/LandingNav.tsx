import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const NAV_LINKS = [
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#departamentos", label: "Departamentos" },
  { href: "#eventos", label: "Eventos" },
  { href: "#inscripcion", label: "Inscripción" },
];

export function LandingNav() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const onHomePage = pathname === "/";
  const toAnchor = (hash: string) => (onHomePage ? hash : `/${hash}`);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
          aria-label="Secciones de la página"
        >
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={toAnchor(link.href)} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a
            href={toAnchor("#inscripcion")}
            className="lp-nav-cta lp-nav-cta-mobile"
            onClick={() => setMenuOpen(false)}
          >
            Envía tu solicitud
          </a>
        </nav>

        <button
          type="button"
          className={`lp-nav-toggle${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <a href={toAnchor("#inscripcion")} className="lp-nav-cta lp-nav-cta-desktop">
          Envía tu solicitud
        </a>
      </div>
    </header>
  );
}
