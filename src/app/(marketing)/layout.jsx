import LandingKeyframes from "@/components/motion/keyframes";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FloatingContact from "@/components/landing/FloatingContact";

// Marketing shell: glass navbar, page, footer, mobile contact pill. Server component; motion lives in the islands.
export default function MarketingLayout({ children }) {
  return (
    <div data-theme="light" className="flex min-h-screen flex-1 flex-col bg-bg text-fg">
      <LandingKeyframes />
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <FloatingContact />
    </div>
  );
}
