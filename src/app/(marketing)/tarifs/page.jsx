import PricingPage from "@/components/landing/Pricing/PricingPage";
import { pricingPage } from "@/content/pricing";

export const metadata = pricingPage.metadata;

export default function Page() {
  return <PricingPage />;
}
