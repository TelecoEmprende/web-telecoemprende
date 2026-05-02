import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { HeroSection } from "../components/home/HeroSection";
import { RegistrationForm } from "../components/home/RegistrationForm";
import { TrustSection } from "../components/home/TrustSection";
import { ParticleBackground } from "../components/layout/ParticleBackground";

export function HomePage() {
  return (
    <div className="page-shell">
      <ParticleBackground />
      <Header />
      <main className="page-content">
        <HeroSection />
        <TrustSection />
        <RegistrationForm evento="taxdown" />
      </main>
      <Footer />
    </div>
  );
}
