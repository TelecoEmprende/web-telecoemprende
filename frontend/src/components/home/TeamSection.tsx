import type { MiembroWeb } from "../../types/equipo";
import { useTranslation } from "../../i18n/translations";
import { Aparece, TitularAnimado } from "./aparece";
import { useMiembrosWeb } from "./useMiembrosWeb";

export function TeamSection() {
  const { t, language } = useTranslation();
  // Las cuentas de /equipo marcadas «Sale en la web» (ver Cuentas del equipo):
  // misma foto y mismo nombre que dentro, sin lista aparte que mantener. Ya
  // vienen ordenadas: presidencia, board, VPs y el resto.
  const miembros = useMiembrosWeb() ?? [];
  const direccion = miembros.filter((m) => m.puesto);
  const resto = miembros.filter((m) => !m.puesto);

  const persona = (miembro: MiembroWeb, i: number, destacada: boolean) => {
    const nombre = `${miembro.nombre} ${miembro.apellido}`.trim();
    return (
      <Aparece como="li" className="in-persona" key={`${nombre}-${i}`} retraso={(i % 4) * 0.07}>
        <img src={miembro.foto} alt={`${t.team.photoAlt} ${nombre}`} loading="lazy" />
        {destacada && miembro.puesto ? (
          <p className="in-persona-puesto">{miembro.puesto[language]}</p>
        ) : null}
        <h3>{nombre}</h3>
      </Aparece>
    );
  };

  return (
    <section className="in-seccion" id="equipo" aria-labelledby="equipo-titulo">
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta">06 — {t.team.eyebrow}</Aparece>
        <TitularAnimado id="equipo-titulo" texto={t.team.heading} />

        {direccion.length > 0 ? (
          <>
            <p className="in-equipo-grupo">{t.team.direccion}</p>
            <ul className="in-equipo in-equipo-direccion">
              {direccion.map((m, i) => persona(m, i, true))}
            </ul>
          </>
        ) : null}

        {resto.length > 0 ? (
          <>
            {direccion.length > 0 ? <p className="in-equipo-grupo">{t.team.miembros}</p> : null}
            <ul className="in-equipo">{resto.map((m, i) => persona(m, i, false))}</ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
