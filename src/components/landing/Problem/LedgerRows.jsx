"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { lpDur, lpEase, lpStep, lpViewport } from "@/components/motion/landing-tokens";

/**
 * Ledger-ruled pain rows. Each row: the rule draws from the start edge, the number and pain rise, a mono "error"
 * tag stamps in, then the SIRH answer appears under it. The total sits on a double rule, as in a ledger.
 */
export default function LedgerRows({ rows, fixLabel, total }) {
  return (
    <ol className="flex flex-col">
      {rows.map((r, i) => (
        <motion.li
          key={r.pain}
          initial="hidden"
          whileInView="visible"
          viewport={lpViewport}
          transition={{ delayChildren: 0.15, staggerChildren: lpStep.base }}
          className="relative grid grid-cols-[2.6em_1fr] gap-x-[1em] pb-[2.2em] pt-[1.6em] sm:grid-cols-[3.2em_1fr_auto]"
        >
          <motion.span
            aria-hidden
            variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: lpDur.draw, ease: lpEase.inOut, delay: i * 0.05 } } }}
            className="absolute inset-x-0 top-0 h-px origin-left bg-border-strong"
          />
          <motion.span
            variants={{ hidden: { opacity: 0, y: "0.5em" }, visible: { opacity: 1, y: "0em", transition: { duration: lpDur.reveal, ease: lpEase.outStrong } } }}
            className="font-mono text-sm text-fg-faint"
          >
            {String(i + 1).padStart(2, "0")}
          </motion.span>

          <div className="min-w-0">
            <motion.h3
              variants={{ hidden: { opacity: 0, y: "0.6em" }, visible: { opacity: 1, y: "0em", transition: { duration: lpDur.reveal, ease: lpEase.outStrong } } }}
              className="font-display text-[1.5em] font-semibold leading-[1.2] tracking-[-0.02em] text-fg"
            >
              {r.pain}
            </motion.h3>
            <motion.p
              variants={{ hidden: { opacity: 0, y: "0.5em" }, visible: { opacity: 1, y: "0em", transition: { duration: lpDur.reveal, ease: lpEase.outStrong } } }}
              className="mt-[0.5em] max-w-[52ch] text-fg-secondary"
            >
              {r.detail}
            </motion.p>
            <motion.p
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: lpDur.slow, delay: 0.25 } } }}
              className="mt-[1em] flex items-start gap-[0.6em] border-s-2 border-primary ps-[0.8em] text-sm text-fg"
            >
              <Check className="mt-[0.25em] size-[1.1em] shrink-0 text-link" aria-hidden strokeWidth={2} />
              <span>
                <span className="font-semibold text-link">{fixLabel}</span> · {r.fix}
              </span>
            </motion.p>
          </div>

          <motion.span
            aria-hidden
            variants={{ hidden: { opacity: 0, scale: 1.2 }, visible: { opacity: 1, scale: 1, transition: { duration: lpDur.stamp, ease: lpEase.outStrong, delay: 0.2 } } }}
            className="col-start-2 mt-[1em] h-fit w-fit rounded-sm border border-danger/40 bg-danger-bg px-[0.55em] py-[0.15em] font-mono text-xs font-medium text-danger-fg sm:col-start-3 sm:row-start-1 sm:mt-0"
          >
            {r.tag}
          </motion.span>
        </motion.li>
      ))}
      <li className="border-t-[4px] border-double border-border-strong pt-[1.1em] font-mono text-sm text-fg-muted">{total}</li>
    </ol>
  );
}
