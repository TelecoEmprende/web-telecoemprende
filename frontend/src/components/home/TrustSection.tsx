import { Rocket, Target, Users, type LucideIcon } from "lucide-react";

const ITEMS: { Icon: LucideIcon; label: string; value: string }[] = [
  {
    Icon: Users,
    label: "Comunidad",
    value: "Estudiantes, alumni y emprendedores de toda la UPM.",
  },
  {
    Icon: Target,
    label: "Enfoque",
    value: "Ideas, conexión y ejecución.",
  },
  {
    Icon: Rocket,
    label: "Organizado por",
    value: "TelecoEmprende, nacido en la ETSIT y abierto a toda la UPM.",
  },
];

export function TrustSection() {
  return (
    <section className="trust-section-react">
      <div className="container-react trust-marquee-react">
        <div className="trust-grid-react">
          {[0, 1].map((trackIndex) => (
            <div
              className={`trust-track-react ${trackIndex === 0 ? "trust-track-primary-react" : "trust-track-secondary-react"}`}
              key={trackIndex}
              aria-hidden={trackIndex === 1}
            >
              {ITEMS.map((item) => (
                <div className="trust-item-react" key={`${trackIndex}-${item.label}`}>
                  <span className="trust-label-react">
                    <item.Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                    {item.label}
                  </span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
