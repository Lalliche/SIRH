"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { Stamp as StampIcon } from "lucide-react";
import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";
import { ARCH } from "../_b/arch";
import { how } from "@/content/how";
import { cn } from "@/lib/utils";
import { follow, variants } from "@/lib/motion-tokens";

/**
 * Step marker built as a real object, not a bordered box: a pine plinth casting a contact shadow, a bevelled
 * arch face lit from the top-start, an engraved numeral (letterpress text-shadow), and the step's icon on a
 * chip at the base. Ink floods the face from the start edge as the scroll connector reaches it, then the whole
 * marker settles with one spring pulse — the cachet being pressed home.
 */
function Node({ index, step, progress, reduce }) {
  const at = (index / 2) * 0.85 + 0.04;
  const fill = useTransform(progress, [at - 0.08, at], [0, 1]);
  const inkClip = useTransform(fill, (v) => `inset(${(1 - v) * 100}% 0 0 0)`);
  const pulse = useTransform(fill, (v) => (v > 0.98 ? 1.05 : 1));
  const scale = useSpring(pulse, { stiffness: 420, damping: 14 });
  const number = String(index + 1);

  return (
    <motion.div variants={reduce ? undefined : variants.pop} className="group relative shrink-0">
      {/* cast shadow on the paper beneath the plinth */}
      <span
        aria-hidden
        className="absolute inset-x-[0.6em] -bottom-[0.35em] h-[0.9em] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(7,43,42,0.28),transparent_70%)] blur-[2px] transition-opacity duration-200 group-hover:opacity-80"
      />

      <motion.div
        style={{ scale: reduce ? 1 : scale }}
        className={cn(
          "relative grid h-[5.4em] w-[4.3em] place-items-center",
          // the plinth: pine body, raised off the page, lit from the top-start, deeper on hover
          "bg-[linear-gradient(160deg,var(--pine-600),var(--pine-800)_58%,var(--pine-900))]",
          "shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_-1.5px_2px_rgba(3,26,26,0.5)_inset,0_10px_22px_-8px_rgba(7,43,42,0.55),0_2px_4px_rgba(7,43,42,0.25)]",
          "transition-shadow duration-200 group-hover:shadow-[0_1px_0_rgba(255,255,255,0.26)_inset,0_-1.5px_2px_rgba(3,26,26,0.5)_inset,0_16px_30px_-10px_rgba(7,43,42,0.6),0_3px_6px_rgba(7,43,42,0.28)]",
          ARCH,
        )}
      >
        {/* bevelled inner face, one step lighter, so the edge reads as thickness */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-[0.3em] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--pine-500)_55%,transparent),transparent_62%)]",
            "shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]",
            ARCH,
          )}
        />
        {/* ink flooding up the face as the connector arrives */}
        <motion.span
          aria-hidden
          style={{ clipPath: reduce ? "inset(0 0 0 0)" : inkClip }}
          className={cn("absolute inset-[0.3em] bg-[linear-gradient(160deg,var(--pine-300),var(--pine-500))] opacity-90", ARCH)}
        />
        {/* specular sweep across the top of the arch */}
        <span
          aria-hidden
          className={cn("absolute inset-x-[0.3em] top-[0.3em] h-[1.5em] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.3),transparent)]", ARCH)}
        />

        {/* engraved numeral: light top edge + dark bottom edge = pressed into the metal */}
        <span
          aria-hidden
          className="relative font-display text-[2em] font-semibold leading-none text-pine-50 [text-shadow:0_-1px_0_rgba(3,26,26,0.55),0_1px_0_rgba(255,255,255,0.3)]"
        >
          {number}
        </span>

        {/* the step's icon on a chalk chip, straddling the plinth's base */}
        <span
          aria-hidden
          className="absolute -bottom-[0.75em] left-1/2 grid size-[1.9em] -translate-x-1/2 place-items-center rounded-full border border-border bg-surface text-link shadow-[0_2px_6px_-1px_rgba(7,43,42,0.3)]"
        >
          <step.icon className="size-[0.95em]" strokeWidth={1.75} />
        </span>
      </motion.div>

      <span className="sr-only">Étape {number}</span>
    </motion.div>
  );
}

/** 3-step timeline. A connector line is drawn by scroll progress; arch nodes fill as the line reaches them. */
export default function HowTimeline({ header }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const smooth = useSpring(scrollYProgress, follow.layers);
  const progress = reduce ? scrollYProgress : smooth;

  return (
    <Container>
      <div className="flex flex-col gap-[4em] md:gap-[5em]">
        {header}

        <div ref={ref} className="relative">
          {/* connector: a carved groove (inset shadow) the ink "flows through" — vertical below md, horizontal at md+.
              Offsets line up with the plinth's centre (h-[5.4em] → 2.7em) so the groove enters and leaves the object. */}
          <div aria-hidden className="absolute bottom-[2.7em] start-[2.15em] top-[2.7em] w-[3px] -translate-x-1/2 rounded-full bg-border shadow-[inset_0_1px_1px_rgba(16,33,31,0.08)] [mask-image:linear-gradient(to_bottom,black_70%,transparent)] md:hidden">
            <motion.div style={{ scaleY: progress, transformOrigin: "top" }} className="h-full w-full rounded-full bg-primary" />
          </div>
          <div aria-hidden className="absolute inset-x-[16.66%] top-[2.7em] hidden h-[3px] -translate-y-1/2 rounded-full bg-border shadow-[inset_0_1px_1px_rgba(16,33,31,0.08)] md:block">
            <motion.div style={{ scaleX: progress, transformOrigin: "left" }} className="h-full w-full rounded-full bg-primary" />
          </div>

          <ol className="relative grid gap-[3em] md:grid-cols-3 md:gap-[2em]">
            {how.steps.map((step, i) => (
              <li key={step.title} className="flex gap-[1.5em] md:flex-col md:items-center md:gap-[2.25em] md:text-center">
                <Node index={i} step={step} progress={progress} reduce={reduce} />
                <Reveal delay={i * 0.08} className="flex min-w-0 flex-col gap-[0.75em] md:items-center">
                  <span className="w-fit rounded-xs border border-border bg-surface px-[0.55em] py-[0.15em] font-mono text-[0.75em] text-fg-secondary">
                    {step.chip}
                  </span>
                  <h3 className="font-display text-[1.375em] font-semibold leading-tight tracking-[-0.015em] text-fg">{step.title}</h3>
                  <p className="max-w-[34ch] text-fg-secondary text-pretty">{step.text}</p>
                  <ul className="mt-[0.25em] flex flex-col gap-[0.35em] text-sm text-fg-muted md:items-center">
                    {step.points.map((p) => (
                      <li key={p} className="flex gap-[0.5em]">
                        <span aria-hidden className="mt-[0.55em] size-[0.35em] shrink-0 rounded-full bg-pine-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal>
          <div className="flex flex-col items-start gap-[1em] rounded-xl border border-border bg-surface p-[1.5em] shadow-sm sm:flex-row sm:items-center md:p-[2em]">
            <span aria-hidden className="grid size-[3em] shrink-0 place-items-center rounded-full bg-primary-soft text-link">
              <StampIcon className="size-[1.4em]" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="text-h3 font-semibold text-fg">{how.migration.title}</h3>
              <p className="mt-[0.25em] max-w-[60ch] text-fg-secondary text-pretty">{how.migration.text}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </Container>
  );
}
