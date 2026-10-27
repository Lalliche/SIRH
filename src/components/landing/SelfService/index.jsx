import Section from "../_b/Section";
import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import Reveal from "@/components/motion/Reveal";
import PhoneDemo from "./PhoneDemo";
import { selfservice } from "@/content/selfservice";

export default function SelfService() {
  return (
    <Section id={selfservice.id} labelledBy="mobile-title">
      <Container>
        <div className="grid items-center gap-[4em] pb-[2em] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-[5em]">
          <div className="flex flex-col gap-[2.5em]">
            <SectionHeader id="mobile-title" eyebrow={selfservice.eyebrow} title={selfservice.title} description={selfservice.description} />
            <ul className="flex flex-col">
              {selfservice.bullets.map((b, i) => (
                <Reveal as="li" key={b.title} delay={i * 0.06} className="flex gap-[1em] border-t border-border py-[1.25em] last:border-b">
                  <span aria-hidden className="grid size-[2.5em] shrink-0 place-items-center rounded-full bg-primary-soft text-link">
                    <b.icon className="size-[1.25em]" strokeWidth={1.5} />
                  </span>
                  <div>
                    <h3 className="font-medium text-fg">{b.title}</h3>
                    <p className="mt-[0.2em] max-w-[46ch] text-fg-secondary text-pretty">{b.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
          <PhoneDemo />
        </div>
      </Container>
    </Section>
  );
}
