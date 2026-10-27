import Container from "@/components/shared/Container";
import Marquee from "@/components/motion/Marquee";
import { trust } from "@/content/trust";

function Chip({ chip }) {
  return (
    <li className="flex shrink-0 items-center gap-[0.7em] rounded-lg border border-border bg-surface px-[0.9em] py-[0.55em] shadow-xs">
      <span className="font-mono text-sm font-semibold text-fg">{chip.code}</span>
      <span aria-hidden className="h-[1.1em] w-px bg-border" />
      <span className="text-xs text-fg-muted">{chip.label}</span>
      {chip.value && <span className="num font-mono text-xs font-medium text-link">{chip.value}</span>}
    </li>
  );
}

export default function TrustStrip() {
  return (
    <section aria-label={trust.label} className="border-y border-border bg-bg-sunken py-[2em]">
      <Container className="mb-[1.4em] flex flex-col items-start justify-between gap-[0.6em] md:flex-row md:items-center">
        <p className="text-sm font-medium text-fg-secondary">{trust.label}</p>
        <p className="inline-flex items-center gap-[0.6em] font-mono text-xs text-fg-muted">
          <span aria-hidden className="relative flex size-[0.55em] text-pine-500">
            <span className="sirh-ping absolute inset-0 rounded-full" />
            <span className="relative size-full rounded-full bg-current" />
          </span>
          <span>{trust.updated}</span>
          <span aria-hidden className="text-fg-faint">·</span>
          <span>{trust.updatedNote}</span>
        </p>
      </Container>
      <Marquee duration={70} gap="0.75em">
        {trust.chips.map((c) => (
          <Chip key={c.code} chip={c} />
        ))}
      </Marquee>
    </section>
  );
}
