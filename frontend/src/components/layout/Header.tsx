import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

type HeaderProps = {
  adminMode?: boolean;
  teamMode?: boolean;
  hidePublicNav?: boolean;
};

export function Header({ adminMode = false, teamMode = false, hidePublicNav = false }: HeaderProps) {
  const location = useLocation();
  const [activePublicTab, setActivePublicTab] = useState<"evento" | "registro">(
    "evento",
  );

  useEffect(() => {
    if (adminMode || teamMode || location.pathname !== "/") {
      return;
    }

    const eventoSection = document.getElementById("evento");
    const registroSection = document.getElementById("registro");

    if (!eventoSection || !registroSection) {
      return;
    }

    const updateActiveTab = () => {
      const registroTop = registroSection.getBoundingClientRect().top;
      const headerHeight =
        document.querySelector(".site-header-react")?.getBoundingClientRect().height ?? 0;
      const threshold = headerHeight + 24;
      setActivePublicTab(registroTop <= threshold ? "registro" : "evento");
    };

    updateActiveTab();
    window.addEventListener("scroll", updateActiveTab, { passive: true });
    window.addEventListener("resize", updateActiveTab);

    return () => {
      window.removeEventListener("scroll", updateActiveTab);
      window.removeEventListener("resize", updateActiveTab);
    };
  }, [adminMode, teamMode, location.pathname]);

  return (
    <header className="site-header-react">
      <div className="container-react header-inner-react">
        <Link to="/" className="brand-react">
          <img src="/logo.png" alt="Logo TelecoEmprende" className="brand-logo-react" />
          <span className="brand-name-react">
            {adminMode ? "TelecoEmprende Admin" : teamMode ? "TelecoEmprende Equipo" : "TelecoEmprende"}
          </span>
        </Link>

        <nav className="header-nav-react" aria-label="Main navigation">
          {adminMode ? (
            <>
              <NavLink to="/">Inicio</NavLink>
              <NavLink to="/admin">Admin</NavLink>
            </>
          ) : teamMode ? (
            <NavLink to="/">Inicio</NavLink>
          ) : hidePublicNav ? null : (
            <div
              className={`public-tab-slider-react public-tab-slider-${activePublicTab}`}
            >
              <a
                href="#evento"
                className={activePublicTab === "evento" ? "active" : undefined}
                onClick={() => setActivePublicTab("evento")}
              >
                Evento
              </a>
              <a
                href="#registro"
                className={activePublicTab === "registro" ? "active" : undefined}
                onClick={() => setActivePublicTab("registro")}
              >
                Registro
              </a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
