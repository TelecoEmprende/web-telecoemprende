import { Handshake, Mic, Rocket } from "lucide-react";

import { useTranslation } from "../../i18n/translations";

const CHIP_ICONS = [Mic, Handshake, Rocket];

export function HeroSection() {
  const { t } = useTranslation();
  const chips = [t.hero.chip1, t.hero.chip2, t.hero.chip3];

  return (
    <section className="lp-hero" id="inicio">
      <div className="lp-hero-glow lp-hero-glow-gold" aria-hidden="true" />
      <div className="lp-hero-glow lp-hero-glow-orange" aria-hidden="true" />

      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="lp-hero-eyebrow">
            <span className="lp-hero-dot" aria-hidden="true" />
            {t.hero.eyebrow}
          </p>

          <h1>
            {t.hero.headingBefore} <span>{t.hero.headingHighlight}</span> {t.hero.headingAfter}
          </h1>

          <p className="lp-hero-lead">{t.hero.lead}</p>
          <p className="lp-hero-lead">
            <mark className="lp-highlight">{t.hero.tempt}</mark>
          </p>

          <div className="lp-hero-actions">
            <a href="#inscripcion" className="lp-btn lp-btn-gold">
              {t.hero.ctaPrimary} <span aria-hidden="true">→</span>
            </a>
            <a href="#quienes-somos" className="lp-btn lp-btn-ghost">
              {t.hero.ctaSecondary}
            </a>
          </div>

          <ul className="lp-hero-chips" aria-label={t.hero.chipsLabel}>
            {chips.map((chip, i) => {
              const Icon = CHIP_ICONS[i];
              return (
                <li key={chip}>
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  {chip}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
