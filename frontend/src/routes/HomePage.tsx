import { useInitialHashScroll } from "../hooks/useInitialHashScroll";
import { LandingNav } from "../components/home/LandingNav";
import { HeroSection } from "../components/home/HeroSection";
import { AboutSection } from "../components/home/AboutSection";
import { DepartmentsSection } from "../components/home/DepartmentsSection";
import { EventsSection } from "../components/home/EventsSection";
import { RequirementsSection } from "../components/home/RequirementsSection";
import { RegistrationForm } from "../components/home/RegistrationForm";
import { LandingFooter } from "../components/layout/LandingFooter";

export function HomePage() {
  // Al llegar de fuera con un ancla (/#inscripcion desde la demo, desde
  // WhatsApp...) el navegador no baja solo: lo baja esto.
  useInitialHashScroll();

  return (
    <div className="lp-shell">
      <LandingNav />
      <main>
        <HeroSection />
        <AboutSection />
        <DepartmentsSection />
        <EventsSection />
        <RequirementsSection />
        <RegistrationForm evento="telecoemprende-2026-27" />
      </main>
      <LandingFooter />
    </div>
  );
}
