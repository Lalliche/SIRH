import Hero from "@/components/landing/Hero";
import TrustStrip from "@/components/landing/TrustStrip";
import Problem from "@/components/landing/Problem";
import Modules from "@/components/landing/Modules";
import PayslipShowcase from "@/components/landing/PayslipShowcase";
import Compliance from "@/components/landing/Compliance";
import HowItWorks from "@/components/landing/HowItWorks";
import Simulator from "@/components/landing/Simulator";
import SelfService from "@/components/landing/SelfService";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import Security from "@/components/landing/Security";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";

// Section order = specs/design-system.md › Landing page direction. Compose only; no markup here.
export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Problem />
      <Modules />
      <PayslipShowcase />
      <Compliance />
      <HowItWorks />
      <Simulator />
      <SelfService />
      <Testimonials />
      <Pricing />
      <Security />
      <FAQ />
      <FinalCTA />
    </>
  );
}
