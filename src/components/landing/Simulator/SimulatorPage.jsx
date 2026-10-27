import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";
import { Button } from "@/components/ui";
import PageIntro from "../_b/PageIntro";
import JsonLd, { faqJsonLd } from "../_b/JsonLd";
import FaqAccordion from "../_b/FaqAccordion";
import PayrollSimulator from "./PayrollSimulator";
import BaremeTable from "./BaremeTable";
import { simulatorPage as page } from "@/content/simulator";

/** Body of /simulateur-irg: h1, simulator, SEO copy (barème, method) and FAQ. */
export default function SimulatorPage() {
  return (
    <>
      <PageIntro eyebrow={page.eyebrow} title={page.title} lead={page.lead} />

      <section id="simulateur" aria-label="Simulateur" className="pb-[5em] md:pb-[7em]">
        <Container>
          <PayrollSimulator />
        </Container>
      </section>

      <section aria-labelledby="bareme-title" className="bg-bg-sunken py-[5em] md:py-[7em]">
        <Container>
          <div className="grid gap-[3em] lg:grid-cols-2 lg:gap-[4em]">
            <div className="flex flex-col gap-[1.25em]">
              <Reveal><h2 id="bareme-title" className="font-display text-[1.875em] font-semibold tracking-[-0.025em] text-balance text-fg">{page.baremeTitle}</h2></Reveal>
              <Reveal delay={0.05}><p className="max-w-[56ch] text-fg-secondary text-pretty">{page.baremeIntro}</p></Reveal>
              <Reveal delay={0.1}><BaremeTable /></Reveal>
              <p className="text-sm text-fg-muted">{page.baremeNote}</p>
            </div>
            <div className="flex flex-col gap-[1.25em]">
              <Reveal><h2 className="font-display text-[1.875em] font-semibold tracking-[-0.025em] text-balance text-fg">{page.stepsTitle}</h2></Reveal>
              <ol className="flex flex-col">
                {page.steps.map((s, i) => (
                  <Reveal as="li" key={s.title} delay={i * 0.05} className="border-b border-border py-[1.1em] first:border-t">
                    <h3 className="font-medium text-fg">{s.title}</h3>
                    <p className="mt-[0.25em] text-fg-secondary text-pretty">{s.text}</p>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="calcul-faq-title" className="py-[5em] md:py-[7em]">
        <Container size="narrow">
          <Reveal><h2 id="calcul-faq-title" className="mb-[1.5em] font-display text-[1.875em] font-semibold tracking-[-0.025em] text-balance text-fg">{page.faqTitle}</h2></Reveal>
          <FaqAccordion items={page.faq} />
        </Container>
      </section>

      <section aria-labelledby="simulateur-cta-title" className="bg-pine-900 py-[5em] text-pine-50 md:py-[6em]">
        <Container className="flex flex-col items-start gap-[1.25em]">
          <h2 id="simulateur-cta-title" className="max-w-[24ch] font-display text-[2em] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-pine-50 md:text-[2.5em]">{page.ctaTitle}</h2>
          <p className="max-w-[48ch] text-lead text-pine-200 text-pretty">{page.ctaText}</p>
          <Button href="/contact" variant="inverse" size="lg">Demander une démo</Button>
        </Container>
      </section>
      <JsonLd data={faqJsonLd(page.faq)} />
    </>
  );
}
