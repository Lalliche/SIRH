import Section from "../_b/Section";
import SectionHeader from "@/components/shared/SectionHeader";
import PricingTiers from "./PricingTiers";
import { pricing } from "@/content/pricing";

// [PLACEHOLDER] prices: see src/content/pricing.js
export default function Pricing() {
  return (
    <Section id={pricing.id} labelledBy="tarifs-title" tone="sunken">
      <PricingTiers linkToPage header={<SectionHeader id="tarifs-title" eyebrow={pricing.eyebrow} title={pricing.title} description={pricing.description} />} />
    </Section>
  );
}
