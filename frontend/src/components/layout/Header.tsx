import { Link, NavLink } from "react-router-dom";

/** Cabecera de /admin (`adminMode`) y de /equipo (sin él). */
export function Header({ adminMode = false }: { adminMode?: boolean }) {
  return (
    <header className="site-header-react">
      <div className="container-react header-inner-react">
        <Link to="/" className="brand-react">
          <img src="/logo.png" alt="Logo TelecoEmprende" className="brand-logo-react" />
          <span className="brand-name-react">
            {adminMode ? "TelecoEmprende Admin" : "TelecoEmprende Equipo"}
          </span>
        </Link>

        <nav className="header-nav-react" aria-label="Main navigation">
          {adminMode ? (
            <>
              <NavLink to="/">Inicio</NavLink>
              <NavLink to="/admin">Admin</NavLink>
              {/* El camino de vuelta: el sidebar de /equipo ya enlaza a /admin,
                  pero desde aquí no había forma de volver sin escribir la URL.
                  Quien entra a /admin solo con la contraseña no tiene sesión de
                  equipo, así que puede caer en el login de /equipo -- que es
                  justo donde tiene que caer. */}
              <NavLink to="/equipo">Equipo</NavLink>
            </>
          ) : (
            <NavLink to="/">Inicio</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
