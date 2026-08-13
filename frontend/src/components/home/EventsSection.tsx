import { CLUB_EVENTS } from "../../data/events";

export function EventsSection() {
  return (
    <section className="lp-events" id="eventos">
      <div className="lp-container">
        <span className="lp-eyebrow lp-eyebrow-dark">Eventos</span>
        <h2 className="lp-heading lp-heading-dark">
          Esto ya ha pasado en la ETSIT. Lo siguiente lo montas tú.
        </h2>
        <p className="lp-section-lead lp-section-lead-dark">
          Un curso de charlas, micrófonos y salas llenas. Aquí tienes una muestra
          de lo que hemos organizado hasta ahora.
        </p>

        <div className="lp-events-grid">
          {CLUB_EVENTS.map((event, index) => (
            <article
              className={`lp-event-card${index === 0 ? " lp-event-card-featured" : ""}`}
              key={event.id}
            >
              <div className="lp-event-cover">
                <img
                  src={event.photos[0].src}
                  alt={event.photos[0].alt}
                  loading="lazy"
                />
                <span className="lp-event-tag">{event.tag}</span>
              </div>

              <div className="lp-event-body">
                <h3>{event.title}</h3>
                {event.description ? <p>{event.description}</p> : null}

                {event.photos.length > 1 ? (
                  <div
                    className="lp-event-thumbs"
                    aria-label={`Más fotos de ${event.title}`}
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
