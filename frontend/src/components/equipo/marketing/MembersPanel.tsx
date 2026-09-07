import { useEffect, useState } from "react";

import { getMiembros } from "../../../api/marketing";
import { AlertBanner } from "../../feedback/AlertBanner";
import { AvatarResponsable } from "./Avatares";
import type { ApiFailure } from "../../../types/api";
import type { Miembro } from "../../../types/marketing";

export function MembersPanel() {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const respuesta = await getMiembros();
        if (activo) setMiembros(respuesta.miembros);
      } catch (err) {
        if (activo) {
          setError((err as ApiFailure)?.message || "No se pudieron cargar los miembros.");
        }
      } finally {
        if (activo) setIsLoading(false);
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (isLoading) return <p className="mkt-cargando-react">Cargando miembros...</p>;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="mkt-panel-header-react">
        <h3>Miembros de Marketing</h3>
      </header>

      {miembros.length === 0 ? (
        <p className="mkt-vacio-react">
          No hay nadie con acceso a Marketing todavía. Los accesos se dan de alta
          desde el panel de administración.
        </p>
      ) : (
        <ul className="mkt-miembros-react">
          {miembros.map((miembro) => (
            <li key={miembro.email} className="mkt-miembro-react">
              <AvatarResponsable email={miembro.email} />
              <div>
                <p className="mkt-miembro-email-react">{miembro.email}</p>
                <p className="mkt-meta-react">
                  {miembro.equipos
                    .map((e) => e.charAt(0).toUpperCase() + e.slice(1))
                    .join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mkt-meta-react">
        Por ahora solo se muestra el email: nombre y apellidos llegarán cuando
        se amplíe la tabla de accesos de equipo.
      </p>
    </section>
  );
}
