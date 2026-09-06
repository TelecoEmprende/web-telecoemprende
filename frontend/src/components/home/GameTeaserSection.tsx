import { useTranslation } from "../../i18n/translations";

export function GameTeaserSection() {
  const { t } = useTranslation();

  return (
    <section className="lp-game" id="juego">
      <div className="lp-container">
        <h2 className="lp-game-gancho">{t.game.gancho}</h2>
        <p className="lp-game-texto">{t.game.texto}</p>
        <a className="lp-game-boton" href="/juego">
          {t.game.boton}
        </a>
      </div>
    </section>
  );
}
