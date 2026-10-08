import type { LucideIcon } from "lucide-react";
import { CalendarDays, ChevronRight, GitBranch, Globe, Hash, Link2, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { getAccesos } from "../../api/equipo";
import { DeptoProvider, DirectorioProvider } from "./DeptoApi";
import { PlataformaPanel } from "./PlataformaPanel";
import { ServiciosPanel } from "./registros/paneles";
import { GITHUB_REPO, SLACK_CLUB, type AccesoClub, type Team } from "../../types/equipo";

type Acceso = { clave: string; nombre: string; detalle: string; url: string; icono: LucideIcon; tono: string };

/** El icono sale del enlace, no de un campo más que rellenar. */
function iconoDe(url: string, tipo: string): LucideIcon {
  if (/whatsapp\.com|wa\.me/.test(url)) return MessageCircle;
  if (/slack\.com/.test(url)) return Hash;
  if (/luma\.com|lu\.ma/.test(url)) return CalendarDays;
  if (/github\.com/.test(url)) return GitBranch;
  return tipo === "mensajeria" ? MessageCircle : Link2;
}

function dominio(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type Props = { teams: Team[] };

/**
 * Herramientas: todos los accesos del club en una pantalla.
 *
 * Arriba, para todo el mundo, los enlaces de siempre (Slack, Luma, la web) y
 * los servicios que Ingeniería marca como "acceso para todo el club" -- así
 * el grupo de WhatsApp o una carpeta compartida se añaden desde Servicios,
 * sin tocar código. Debajo, solo para Ingeniería, el estado de la plataforma
 * y la lista entera de servicios, que antes eran dos secciones sueltas.
 */
export function HerramientasPanel({ teams }: Props) {
  const [accesos, setAccesos] = useState<AccesoClub[]>([]);
  const [luma, setLuma] = useState("");
  const esIngenieria = teams.includes("ingenieria");

  useEffect(() => {
    let activo = true;
    getAccesos()
      .then((r) => {
        if (!activo || !r.ok) return;
        setAccesos(r.accesos);
        setLuma(r.luma);
      })
      .catch(() => {
        // Sin la lista, quedan los accesos fijos.
      });
    return () => {
      activo = false;
    };
  }, []);

  const tarjetas: Acceso[] = [
    { clave: "slack", nombre: "Slack del club", detalle: "Chat del equipo", url: SLACK_CLUB, icono: Hash, tono: "azul" },
    ...(luma
      ? [{ clave: "luma", nombre: "Calendario en Luma", detalle: "Eventos y apuntarse", url: luma, icono: CalendarDays, tono: "chispa" }]
      : []),
    ...accesos.map((a) => ({
      clave: `servicio-${a.id}`,
      nombre: a.nombre,
      detalle: a.notas || dominio(a.url),
      url: a.url,
      icono: iconoDe(a.url, a.tipo),
      tono: /whatsapp\.com|wa\.me/.test(a.url) ? "impulso" : "noche",
    })),
    { clave: "web", nombre: "telecoemprende.es", detalle: "La web pública", url: "/", icono: Globe, tono: "noche" },
    ...(esIngenieria
      ? [{ clave: "github", nombre: "GitHub", detalle: "Repositorio de la web", url: GITHUB_REPO, icono: GitBranch, tono: "noche" }]
      : []),
  ];

  return (
    <div className="herr-react">
      <section className="crm-c herr-accesos-react" aria-labelledby="herr-accesos-titulo">
        <div className="crm-cabecera-react">
          <p className="crm-k" id="herr-accesos-titulo">Accesos del club</p>
          {esIngenieria ? (
            <span className="crm-s">Añade más desde Servicios, marcando «Acceso para todo el club».</span>
          ) : (
            <span className="crm-s">¿Falta alguno? Pídeselo a Ingeniería.</span>
          )}
        </div>
        <div className="herr-rejilla-react">
          {tarjetas.map(({ clave, nombre, detalle, url, icono: Icono, tono }) => (
            <a
              key={clave}
              className={`herr-tarjeta-react herr-tono-${tono}-react`}
              href={url}
              target={url.startsWith("/") ? undefined : "_blank"}
              rel={url.startsWith("/") ? undefined : "noreferrer noopener"}
            >
              <span className="herr-icono-react" aria-hidden="true">
                <Icono />
              </span>
              <span className="herr-texto-react">
                <strong>{nombre}</strong>
                <span>{detalle}</span>
              </span>
              <ChevronRight aria-hidden="true" className="herr-flecha-react" />
            </a>
          ))}
        </div>
      </section>

      {esIngenieria ? (
        <DeptoProvider value="ingenieria">
          <DirectorioProvider>
            <PlataformaPanel />
            <section className="herr-servicios-react" aria-label="Servicios">
              <p className="crm-k">Servicios</p>
              <ServiciosPanel />
            </section>
          </DirectorioProvider>
        </DeptoProvider>
      ) : null}
    </div>
  );
}
