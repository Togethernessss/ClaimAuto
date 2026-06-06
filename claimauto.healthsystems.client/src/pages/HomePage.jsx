import HomeNavbar from '../components/home/HomeNavbar';
import HeroSection from '../components/home/HeroSection';
import StatsBanner from '../components/home/StatsBanner';
import FeaturesSection from '../components/home/FeaturesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import StakeholdersSection from '../components/home/StakeholdersSection';
import CTASection from '../components/home/CTASection';
import HomeFooter from '../components/home/HomeFooter';

export default function HomePage() {
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      <HomeNavbar />
      <HeroSection />
      <StatsBanner />
      <FeaturesSection />
      <HowItWorksSection />
      <StakeholdersSection />
      <CTASection />
      <HomeFooter />
    </div>
  );
}