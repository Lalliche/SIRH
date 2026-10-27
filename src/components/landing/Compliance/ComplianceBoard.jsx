"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import Container from "@/components/shared/Container";
import { Stamp } from "@/components/ui";
import DzMap from "../_b/DzMap";
import { compliance } from "@/content/compliance";
import { date as dateOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { duration, ease, stagger } from "@/lib/motion-tokens";

function CheckMark({ delay, reduce }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[1.75em] shrink-0 text-pine-600" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <motion.circle cx="12" cy="12" r="10" initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: duration.reveal, ease: ease.out, delay }} />
      <motion.path d="M7.5 12.5l3 3 6-6.5" initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: duration.reveal, ease: ease.out, delay: delay + duration.panel }} />
    </svg>
  );
}

function Row({ row, index, active, onActive, reduce }) {
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: duration.reveal, ease: ease.out, delay: (index % 3) * stagger.tight }}
      onPointerEnter={() => onActive(row.hub)}
      className={cn("relative border-b border-border px-[0.25em] py-[1.25em] transition-colors duration-200 sm:px-[0.75em]", active && "bg-primary-soft/40")}
    >
      {/* scroll spy: the row crossing the middle band lights up its hub on the map */}
      <motion.span aria-hidden className="pointer-events-none absolute inset-0" onViewportEnter={() => onActive(row.hub)} viewport={{ margin: "-45% 0px -45% 0px" }} />
      <div className="flex items-start gap-[1em]">
        <CheckMark delay={index * stagger.tight} reduce={reduce} />
        <div className="min-w-0 flex-1">
          <div className="flex items-end gap-[0.6em]">
            <h3 className="shrink-0 text-[1.0625em] font-medium text-fg">{row.title}</h3>
            <span aria-hidden className="mb-[0.35em] hidden min-w-[1em] flex-1 border-b border-dotted border-border-strong sm:block" />
            <p className="ms-auto flex shrink-0 flex-col items-end leading-tight sm:ms-0">
              <span className="text-[0.6875em] uppercase tracking-[0.08em] text-fg-muted">{compliance.asOfLabel}</span>
              <time dateTime={row.asOf} className="font-mono text-code font-medium text-fg">{dateOf(row.asOf)}</time>
            </p>
          </div>
          <p className="mt-[0.35em] max-w-[52ch] text-sm text-fg-secondary text-pretty">{row.detail}</p>
          <span className="mt-[0.6em] inline-block rounded-xs bg-bg-sunken px-[0.5em] py-[0.15em] font-mono text-[0.75em] text-fg-muted">{row.tag}</span>
        </div>
      </div>
    </motion.li>
  );
}

/** Sticky left (title slot + map), right ledger. `header` is a server-rendered SectionHeader passed as a slot. */
export default function ComplianceBoard({ header }) {
  const reduce = useReducedMotion();
  const [activeHub, setActiveHub] = useState("alger");
  const footRef = useRef(null);
  const sealIn = useInView(footRef, { once: true, amount: 0.6 });

  return (
    <Container>
      <div className="grid gap-[3.5em] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[4.5em]">
        <div className="flex flex-col gap-[2.5em] lg:sticky lg:top-[6.5em] lg:self-start">
          {header}
          <div className="relative mx-auto w-full max-w-[26em] lg:mx-0">
            <DzMap activeHub={activeHub} label={compliance.mapLabel} className="h-auto w-full" />
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between border-b-2 border-fg pb-[0.6em] font-mono text-[0.75em] uppercase tracking-[0.08em] text-fg-muted">
            <span>Contrôle</span>
            <span>Version des règles</span>
          </div>
          <ol>
            {compliance.rows.map((row, i) => (
              <Row key={row.id} row={row} index={i} active={activeHub === row.hub} onActive={setActiveHub} reduce={reduce} />
            ))}
          </ol>
          <div ref={footRef} className="flex items-center justify-between gap-[1.5em] border-b-[4px] border-double border-border-strong py-[1.75em] ps-[0.25em] sm:ps-[0.75em]">
            <div className="min-w-0">
              <p className="text-sm text-fg-secondary">{compliance.footer.label}</p>
              <time dateTime={compliance.footer.asOf} className="font-mono text-[1.125em] font-medium text-fg">{dateOf(compliance.footer.asOf)}</time>
              <p className="mt-[0.6em] max-w-[40ch] text-[0.8125em] text-fg-muted text-pretty">{compliance.footer.note}</p>
            </div>
            <div className="flex size-[7.5em] shrink-0 items-center justify-center" aria-hidden>
              {(sealIn || reduce) && <Stamp label={compliance.stampLabel} sub={compliance.stampSub} className="shrink-0" />}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
