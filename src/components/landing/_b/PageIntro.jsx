import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";

/** Header for standalone marketing pages (/tarifs, /simulateur-irg, /contact). Carries the page's single h1. */
export default function PageIntro({ eyebrow, title, lead, id = "page-title" }) {
  return (
    <header className="relative pt-[8em] pb-[3em] md:pt-[9em]">
      <Container>
        <div className="mx-auto flex max-w-[48em] flex-col items-center gap-[1em] text-center md:mx-0 md:items-start md:text-start">
          {eyebrow && (
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-link">{eyebrow}</p>
            </Reveal>
          )}
          <Reveal delay={0.05}>
            <h1 id={id} className="font-display text-[2.5em] font-semibold leading-[1.05] tracking-[-0.03em] text-balance text-fg md:text-[3.25em]">
              {title}
            </h1>
          </Reveal>
          {lead && (
            <Reveal delay={0.1}>
              <p className="max-w-[56ch] text-lead text-fg-secondary">{lead}</p>
            </Reveal>
          )}
        </div>
      </Container>
    </header>
  );
}
