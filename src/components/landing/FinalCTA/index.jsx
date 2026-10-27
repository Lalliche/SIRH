import { Mail, MessageCircle, Phone } from "lucide-react";
import Section from "../_b/Section";
import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import Reveal from "@/components/motion/Reveal";
import { Button } from "@/components/ui";
import StampMotif from "../_b/StampMotif";
import ContactForm from "../_b/ContactForm";
import { whatsappUrl } from "@/lib/contact";
import { cta } from "@/content/cta";
import { site } from "@/content/site";

export default function FinalCTA() {
  return (
    <Section id={cta.id} labelledBy="demo-title" tone="dark">
      {/* vignette + stamp motif at 8% */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--pine-800),transparent_65%)] opacity-60" />
      <StampMotif className="absolute -end-[6em] top-1/2 size-[40em] -translate-y-1/2 -rotate-[9deg] text-pine-50 opacity-[0.08]" />
      <Container className="relative">
        <div className="grid items-start gap-[3em] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[5em]">
          <div className="flex flex-col gap-[2em]">
            <SectionHeader id="demo-title" tone="dark" eyebrow={cta.eyebrow} title={cta.title} description={cta.description} />
            <Reveal delay={0.1} className="flex flex-col gap-[1.5em]">
              <ul className="flex flex-col gap-[0.75em] text-pine-100">
                <li className="flex items-center gap-[0.75em]">
                  <Phone aria-hidden className="size-[1.2em] text-pine-300" strokeWidth={1.5} />
                  <span className="sr-only">{cta.contact.phoneLabel}</span>
                  <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="font-mono hover:text-white hover:underline">{site.phone}</a>
                </li>
                <li className="flex items-center gap-[0.75em]">
                  <Mail aria-hidden className="size-[1.2em] text-pine-300" strokeWidth={1.5} />
                  <span className="sr-only">{cta.contact.emailLabel}</span>
                  <a href={`mailto:${site.email}`} className="hover:text-white hover:underline">{site.email}</a>
                </li>
                <li className="ps-[1.95em] text-sm text-pine-300">{cta.contact.hours}</li>
              </ul>
              <div className="flex flex-col items-start gap-[0.75em]">
                <Button href={whatsappUrl(cta.whatsapp.message)} variant="inverse" size="lg" target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden className="size-[1.1em]" strokeWidth={1.75} />
                  {cta.whatsapp.label}
                </Button>
                <p className="max-w-[40ch] text-sm text-pine-300">{cta.whatsapp.hint}</p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
