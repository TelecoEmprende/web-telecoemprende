import { useInitialHashScroll } from "../hooks/useInitialHashScroll";
import { LandingNav } from "../components/home/LandingNav";
import { HeroSection } from "../components/home/HeroSection";
import { AboutSection } from "../components/home/AboutSection";
import { LatestNewsSection } from "../components/home/LatestNewsSection";
import { DepartmentsSection } from "../components/home/DepartmentsSection";
import { EventsSection } from "../components/home/EventsSection";
import { RecursosSection } from "../components/home/RecursosSection";
import { TeamSection } from "../components/home/TeamSection";
import { ClosingSection } from "../components/home/ClosingSection";
import { LandingFooter } from "../components/layout/LandingFooter";

export function HomePage() {
  // Al llegar de fuera con un ancla (/#eventos desde WhatsApp, desde
  // /news...) el navegador no baja solo: lo baja esto.
  useInitialHashScroll();

  return (
    <div className="lp-shell">
      <LandingNav />
      <main>
        <HeroSection />
        <AboutSection />
        <LatestNewsSection />
        <DepartmentsSection />
        <EventsSection />
        <RecursosSection />
        <TeamSection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
