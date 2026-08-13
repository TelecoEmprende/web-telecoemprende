import { LandingNav } from "../components/home/LandingNav";
import { HeroSection } from "../components/home/HeroSection";
import { AboutSection } from "../components/home/AboutSection";
import { EventsSection } from "../components/home/EventsSection";
import { RequirementsSection } from "../components/home/RequirementsSection";
import { RegistrationForm } from "../components/home/RegistrationForm";
import { LandingFooter } from "../components/layout/LandingFooter";

export function HomePage() {
  return (
    <div className="lp-shell">
      <LandingNav />
      <main>
        <HeroSection />
        <AboutSection />
        <EventsSection />
        <RequirementsSection />
        <RegistrationForm evento="telecoemprende-2026-27" />
      </main>
      <LandingFooter />
    </div>
  );
}
