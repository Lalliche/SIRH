import { Clock, MessageCircle, Phone } from "lucide-react";
import Container from "@/components/shared/Container";
import Zellige from "@/components/shared/Zellige";
import SplitReveal from "@/components/motion/SplitReveal";
import { lpStep } from "@/components/motion/landing-tokens";
import { hero } from "@/content/hero";
import { site } from "@/content/site";
import HeroCtas from "./HeroCtas";
import HeroDashboardPreview from "./HeroDashboardPreview";

const digits = (s) => s.replace(/[^\d+]/g, "");
// First-paint stagger for the non-headline pieces (CSS keyframes, visible in the SSR markup).
const after = (n) => ({ animationDelay: `${0.15 + n * lpStep.base * 2}s` });

export default function Hero() {
  const parts = hero.title.map((p) => ({ ...p, className: p.highlight ? "sirh-glint-text" : undefined }));
  const trust = [
    { icon: MessageCircle, label: hero.trust.whatsappLabel, value: site.whatsapp, href: `https://wa.me/${digits(site.whatsapp).replace("+", "")}` },
    { icon: Phone, label: hero.trust.phoneLabel, value: site.phone, href: `tel:${digits(site.phone)}` },
  ];

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip pb-[5em] pt-[7em] md:pt-[8em] lg:pb-[7em]">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--pine-100)_60%,transparent),transparent_42%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 text-fg opacity-[0.08] [mask-image:radial-gradient(70%_60%_at_85%_30%,black,transparent_70%)]">
        <Zellige id="zellige-hero" />
      </div>

      <Container>
        <div className="mx-auto flex max-w-[44em] flex-col items-center gap-[1.6em] text-center">
          <p
            className="sirh-rise inline-flex items-center gap-[0.6em] rounded-pill border border-border bg-surface px-[0.9em] py-[0.35em] font-mono text-xs font-medium text-fg-secondary shadow-xs"
            style={after(0)}
          >
            <span aria-hidden className="size-[0.5em] rounded-full bg-pine-500" />
            {hero.eyebrow}
          </p>

          <SplitReveal
            as="h1"
            trigger="load"
            baseDelay={0.1}
            parts={parts}
            className="text-[2.75em] font-semibold leading-[1.02] tracking-[-0.035em] text-fg [text-wrap:balance] sm:text-[3.5em] md:text-[4.5em] lg:text-[4.1em]"
          />

          <p className="sirh-rise max-w-[46ch] text-lead text-fg-secondary" style={after(3)}>
            {hero.lead}
          </p>

          <div className="sirh-rise" style={after(4)}>
            <HeroCtas primary={hero.primary} secondary={hero.secondary} />
          </div>

          <ul className="sirh-rise flex flex-wrap items-center justify-center gap-x-[1.5em] gap-y-[0.6em] text-sm text-fg-secondary" style={after(5)}>
            {trust.map(({ icon: Icon, label, value, href }) => (
              <li key={label}>
                <a href={href} className="inline-flex items-center gap-[0.5em] transition-colors duration-150 hover:text-fg">
                  <Icon className="size-[1.1em] text-link" aria-hidden strokeWidth={1.75} />
                  <span className="sr-only">{label} : </span>
                  <span className="num">{value}</span>
                </a>
              </li>
            ))}
            <li className="inline-flex items-center gap-[0.5em]">
              <Clock className="size-[1.1em] text-link" aria-hidden strokeWidth={1.75} />
              {hero.trust.response}
            </li>
          </ul>
        </div>

      </Container>

      {/* Wider than the copy column: the preview is the page's proof, so it gets the room. */}
      <Container size="wide">
        <HeroDashboardPreview />
      </Container>
    </section>
  );
}
