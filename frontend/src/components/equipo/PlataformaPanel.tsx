import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { AlertBanner } from "../feedback/AlertBanner";
import { Esqueleto } from "../feedback/Esqueleto";
import { Contador, FilaAnimada } from "../movimiento";
import { useApi } from "./DeptoApi";
import { GITHUB_REPO } from "../../types/equipo";
import type { ApiFailure } from "../../types/api";
import type { EstadoPlataforma } from "../../types/registros";

/**
 * Estado de la plataforma para Ingeniería: qué versión está desplegada, si la
 * base de datos contesta y qué integraciones están puestas.
 *
 * Existe porque casi todo falla en silencio a propósito (el correo y Slack
 * nunca bloquean la operación que los dispara): sin una pantalla que lo diga,
 * una variable que falta en Vercel solo se descubre cuando alguien se queja.
 */
export function PlataformaPanel() {
  const { getPlataforma } = useApi();
  const [estado, setEstado] = useState<EstadoPlataforma | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Sube en cada "Volver a comprobar": re-lanza el efecto sin más estado.
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setIsLoading(true);
    setError(null);
    getPlataforma()
      .then((respuesta) => {
        if (activo) setEstado(respuesta);
      })
      .catch((err) => {
        if (activo) {
          setError((err as ApiFailure)?.message || "No se pudo comprobar la plataforma.");
        }
      })
      .finally(() => {
        if (activo) setIsLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [getPlataforma, intento]);

  if (isLoading && !estado) return <Esqueleto filas={4} />;

  const integraciones = estado?.integraciones ?? [];
  const puestas = integraciones.filter((i) => i.configurada).length;
  const faltan = integraciones.length - puestas;

  return (
    <>
      <header className="crm-cabecera-react">
        <h3 className="crm-h1">Plataforma</h3>
        <button
          type="button"
          className="mkt-btn-mini-react"
          onClick={() => setIntento((n) => n + 1)}
          disabled={isLoading}
        >
          {isLoading ? "Comprobando..." : "Volver a comprobar"}
        </button>
      </header>

      {error ? <AlertBanner variant="error" message={error} /> : null}

      {estado ? (
        <>
          <div className="mkt-tiles-react">
            <div className="crm-c mkt-tile-react">
              <p className="crm-k">Entorno</p>
              <span className="mkt-tile-numero-react">{estado.entorno}</span>
              <span className="mkt-meta-react">{estado.rama || "Sin datos de despliegue"}</span>
            </div>

            <div className="crm-c mkt-tile-react">
              <p className="crm-k">Versión desplegada</p>
              <span className="mkt-tile-numero-react">{estado.commit || "—"}</span>
              {estado.commit ? (
                <a
                  className="reg-enlace-react"
                  href={`${GITHUB_REPO}/commit/${encodeURIComponent(estado.commit)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <ExternalLink aria-hidden="true" /> Ver el commit en GitHub
                </a>
              ) : (
                <span className="mkt-meta-react">Solo se conoce desplegada en Vercel</span>
              )}
            </div>

            <div
              className={`crm-c mkt-tile-react${estado.base_de_datos.ok ? "" : " mkt-tile-alerta-react"}`}
            >
              <p className="crm-k">Base de datos</p>
              <span className="mkt-tile-numero-react">
                {estado.base_de_datos.ok ? "OK" : "Sin respuesta"}
              </span>
              <span className="mkt-meta-react">
                {estado.base_de_datos.ok ? `${estado.base_de_datos.ms} ms` : "No contesta al SELECT 1"}
              </span>
            </div>

            <div className={`crm-c mkt-tile-react${faltan > 0 ? " mkt-tile-alerta-react" : ""}`}>
              <p className="crm-k">Integraciones</p>
              <Contador
                valor={`${puestas}/${integraciones.length}`}
                className="mkt-tile-numero-react"
              />
              <span className="mkt-meta-react">
                {faltan === 0 ? "Todas configuradas" : `${faltan} sin configurar`}
              </span>
            </div>
          </div>

          <div className="crm-c mkt-grupo-react">
            <h4 className="mkt-grupo-titulo-react">Integraciones</h4>
            <ul className="mkt-miembros-react">
              {integraciones.map((integracion, indice) => (
                <FilaAnimada key={integracion.variable} como="li" indice={indice}>
                  <span className="mkt-miembro-react">
                    <span className="mkt-miembro-datos-react">
                      <span className="mkt-miembro-nombre-react">{integracion.nombre}</span>
                      <span className="mkt-meta-react">
                        {integracion.configurada
                          ? integracion.variable
                          : `${integracion.efecto} Falta ${integracion.variable} en Vercel.`}
                      </span>
                    </span>
                    <span
                      className={`crm-tag ${integracion.configurada ? "crm-tag-verde-react" : "crm-tag-ambar-react"}`}
                    >
                      {integracion.configurada ? "Configurada" : "Falta"}
                    </span>
                  </span>
                </FilaAnimada>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </>
  );
}
