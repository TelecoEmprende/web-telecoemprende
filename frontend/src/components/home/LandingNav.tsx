import { useLocation } from "react-router-dom";

const NAV_LINKS = [
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#departamentos", label: "Departamentos" },
  { href: "#eventos", label: "Eventos" },
  { href: "#inscripcion", label: "Inscripción" },
];

export function LandingNav() {
  const { pathname } = useLocation();
  const onHomePage = pathname === "/";
  const toAnchor = (hash: string) => (onHomePage ? hash : `/${hash}`);

  return (
    <header className="lp-nav">
      <div className="lp-container lp-nav-inner">
        <a href={toAnchor("#inicio")} className="lp-nav-brand">
          <img src="/logo.png" alt="Logo de TelecoEmprende" className="lp-nav-logo" />
          <span className="lp-nav-name">
            Teleco<span>Emprende</span>
          </span>
        </a>

        <nav className="lp-nav-links" aria-label="Secciones de la página">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={toAnchor(link.href)}>
              {link.label}
            </a>
          ))}
        </nav>

        <a href={toAnchor("#inscripcion")} className="lp-nav-cta">
          Envía tu solicitud
        </a>
      </div>
    </header>
  );
}
