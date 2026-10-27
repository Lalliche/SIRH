import Section from "../_b/Section";
import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import FaqAccordion from "../_b/FaqAccordion";
import JsonLd, { faqJsonLd } from "../_b/JsonLd";
import { Button } from "@/components/ui";
import { whatsappUrl } from "@/lib/contact";
import { faq } from "@/content/faq";
import { cta } from "@/content/cta";

export default function FAQ() {
  return (
    <Section id={faq.id} labelledBy="faq-title">
      <Container>
        <div className="grid gap-[3em] lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-[5em]">
          <div className="flex flex-col gap-[1.75em] lg:sticky lg:top-[6.5em] lg:self-start">
            <SectionHeader id="faq-title" eyebrow={faq.eyebrow} title={faq.title} description={faq.description} />
            <Button href={whatsappUrl(cta.whatsapp.message)} variant="secondary" className="self-start">
              {faq.contactLabel}
            </Button>
          </div>
          <FaqAccordion items={faq.items} />
        </div>
      </Container>
      <JsonLd data={faqJsonLd(faq.items)} />
    </Section>
  );
}
