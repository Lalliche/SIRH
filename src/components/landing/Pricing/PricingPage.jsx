import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";
import PageIntro from "../_b/PageIntro";
import FaqAccordion from "../_b/FaqAccordion";
import JsonLd, { faqJsonLd } from "../_b/JsonLd";
import PricingTiers from "./PricingTiers";
import ComparisonTable from "./ComparisonTable";
import { pricingPage as page } from "@/content/pricing";

/** Body of /tarifs: h1, interactive tiers, comparison table, FAQ. */
export default function PricingPage() {
  return (
    <>
      <PageIntro eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section id="tarifs" aria-label="Offres et prix" className="pb-[2em]">
        <PricingTiers />
      </section>
      <ComparisonTable />
      <section aria-labelledby="tarifs-faq-title" className="bg-bg-sunken py-[5em] md:py-[7em]">
        <Container size="narrow">
          <Reveal>
            <h2 id="tarifs-faq-title" className="mb-[1.5em] font-display text-[1.875em] font-semibold tracking-[-0.025em] text-balance text-fg">{page.faqTitle}</h2>
          </Reveal>
          <FaqAccordion items={page.faq} />
        </Container>
      </section>
      <JsonLd data={faqJsonLd(page.faq)} />
    </>
  );
}
