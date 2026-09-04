import { CLUB_EVENTS } from "../../data/events";
import { useTranslation } from "../../i18n/translations";

export function EventsSection() {
  const { t, language } = useTranslation();

  return (
    <section className="lp-events" id="eventos">
      <div className="lp-container">
        <span className="lp-eyebrow lp-eyebrow-dark">{t.events.eyebrow}</span>
        <h2 className="lp-heading lp-heading-dark">{t.events.heading}</h2>
        <p className="lp-section-lead lp-section-lead-dark">{t.events.lead}</p>

        <div className="lp-events-grid">
          {CLUB_EVENTS.map((event) => (
            <article className="lp-event-card" key={event.id}>
              <div className="lp-event-cover">
                <img
                  src={event.photos[0].src}
                  alt={event.photos[0].alt}
                  loading="lazy"
                />
                <span className="lp-event-tag">{event.tag[language]}</span>
                {event.companyLogo ? (
                  <span className="lp-event-logo">
                    <img
                      src={event.companyLogo.src}
                      alt={event.companyLogo.alt}
                      loading="lazy"
                    />
                  </span>
                ) : null}
              </div>

              <div className="lp-event-body">
                <h3>{event.title}</h3>
                {event.description ? <p>{event.description[language]}</p> : null}

                {event.photos.length > 1 ? (
                  <div
                    className="lp-event-thumbs"
                    aria-label={`${t.events.morePhotosLabel} ${event.title}`}
                  >
                    {event.photos.slice(1).map((photo) => (
                      <img
                        key={photo.src}
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
