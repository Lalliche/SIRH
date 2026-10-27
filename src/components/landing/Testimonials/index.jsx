import Section from "../_b/Section";
import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import QuoteStage from "./QuoteStage";
import { testimonials } from "@/content/testimonials";

// [PLACEHOLDER] Fictional quotes, see src/content/testimonials.js. Replace before launch.
export default function Testimonials() {
  return (
    <Section id={testimonials.id} labelledBy="temoignages-title">
      <Container className="flex flex-col gap-[3.5em]">
        <SectionHeader id="temoignages-title" eyebrow={testimonials.eyebrow} title={testimonials.title} />
        <QuoteStage />
        <p className="text-[0.8125em] text-fg-muted">{testimonials.placeholderNote}</p>
      </Container>
    </Section>
  );
}
