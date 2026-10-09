import { useTranslation } from "../../i18n/translations";
import { Aparece, TitularAnimado } from "./aparece";
import { useMiembrosWeb } from "./useMiembrosWeb";

export function TeamSection() {
  const { t } = useTranslation();
  // Las cuentas de /equipo marcadas «Sale en la web» (ver Cuentas del equipo):
  // misma foto y mismo nombre que dentro, sin lista aparte que mantener.
  const miembros = useMiembrosWeb() ?? [];

  return (
    <section className="in-seccion" id="equipo" aria-labelledby="equipo-titulo">
      <div className="in-wrap">
        <Aparece como="p" className="in-etiqueta">06 — {t.team.eyebrow}</Aparece>
        <TitularAnimado id="equipo-titulo" texto={t.team.heading} />

        <ul className="in-equipo">
          {miembros.map((miembro, i) => {
            const nombre = `${miembro.nombre} ${miembro.apellido}`.trim();
            return (
              <Aparece como="li" className="in-persona" key={`${nombre}-${i}`} retraso={(i % 4) * 0.07}>
                <img src={miembro.foto} alt={`${t.team.photoAlt} ${nombre}`} loading="lazy" />
                <h3>{nombre}</h3>
              </Aparece>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
