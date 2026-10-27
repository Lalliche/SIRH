"use client";

import { motion, useReducedMotion } from "motion/react";
import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";
import { Badge, Card } from "@/components/ui";
import { security } from "@/content/security";
import { cn } from "@/lib/utils";
import { duration, ease, stagger, variants } from "@/lib/motion-tokens";

function Icon({ icon: I }) {
  return (
    <span aria-hidden className="grid size-[2.75em] shrink-0 place-items-center rounded-full bg-primary-soft text-link">
      <I className="size-[1.35em]" strokeWidth={1.5} />
    </span>
  );
}

function Tile({ item, className, delay = 0, children }) {
  return (
    <Reveal delay={delay} className={cn("flex", className)}>
      <Card as="article" interactive className="flex w-full flex-col gap-[1.25em] p-[1.75em]">
        <div className="flex items-center gap-[0.9em]">
          <Icon icon={item.icon} />
          <h3 className="font-display text-[1.25em] font-semibold tracking-[-0.015em] text-fg">{item.title}</h3>
        </div>
        <p className="max-w-[48ch] text-fg-secondary text-pretty">{item.text}</p>
        {children}
      </Card>
    </Reveal>
  );
}

/** Rotating-looking 30 s ring: a stroke that redraws forever while visible (static under reduced motion). */
function CodeRing({ reduce }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[2em] -rotate-90 text-pine-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" className="text-border" stroke="var(--border)" />
      <motion.circle
        cx="12"
        cy="12"
        r="9"
        initial={{ pathLength: reduce ? 0.7 : 1 }}
        whileInView={reduce ? undefined : { pathLength: 0 }}
        viewport={{ margin: "-20%" }}
        transition={{ duration: duration.reveal * 8, ease: "linear", repeat: Infinity }}
      />
    </svg>
  );
}

export default function SecurityGrid({ header }) {
  const reduce = useReducedMotion();
  const { hosting, roles, audit, backups, twofa } = security;
  return (
    <Container className="flex flex-col gap-[3.5em]">
      {header}
      <div className="grid gap-[1.25em] lg:grid-cols-6">
        <Tile item={hosting} className="lg:col-span-3">
          <div className="mt-auto flex flex-col gap-[0.75em] border-t border-border pt-[1.1em]">
            <Badge tone="warning">{hosting.status}</Badge>
            <p className="text-sm text-fg-muted">{hosting.note}</p>
          </div>
        </Tile>

        <Tile item={roles} className="lg:col-span-3" delay={0.06}>
          <dl className="mt-auto border-t border-border">
            {roles.list.map((r) => (
              <div key={r.role} className="flex items-baseline gap-[0.6em] border-b border-border py-[0.55em] text-sm last:border-b-0">
                <dt className="shrink-0 font-medium text-fg">{r.role}</dt>
                <span aria-hidden className="mb-[0.25em] min-w-[0.5em] flex-1 border-b border-dotted border-border-strong" />
                <dd className="text-end text-fg-muted">{r.scope}</dd>
              </div>
            ))}
          </dl>
        </Tile>

        <Tile item={audit} className="lg:col-span-2">
          <motion.ol
            variants={variants.container}
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            transition={{ staggerChildren: stagger.base }}
            className="mt-auto flex flex-col gap-[0.5em] rounded-lg bg-bg-sunken p-[0.9em] font-mono text-[0.75em] leading-snug"
          >
            {audit.lines.map((l) => (
              <motion.li key={l.time} variants={variants.rise} className="flex gap-[0.7em] text-fg-secondary">
                <span className="shrink-0 text-fg-muted">{l.time}</span>
                <span>
                  <span className="font-medium text-fg">{l.who}</span> {l.what}
                </span>
              </motion.li>
            ))}
          </motion.ol>
        </Tile>

        <Tile item={backups} className="lg:col-span-2" delay={0.06}>
          <dl className="mt-auto grid grid-cols-2 gap-[1em] border-t border-border pt-[1.1em]">
            {backups.facts.map((f) => (
              <div key={f.label}>
                <dt className="text-[0.75em] uppercase tracking-[0.08em] text-fg-muted">{f.label}</dt>
                <dd className="mt-[0.2em] font-medium text-fg">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Tile>

        <Tile item={twofa} className="lg:col-span-2" delay={0.12}>
          <div className="mt-auto flex items-center justify-between gap-[1em] rounded-lg bg-bg-sunken p-[0.9em]">
            <ul className="flex gap-[0.4em]" aria-label="Exemple de code à usage unique">
              {twofa.digits.map((d, i) => (
                <motion.li
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: duration.panel, ease: ease.out, delay: i * stagger.base }}
                  className="grid h-[2.4em] w-[1.8em] place-items-center rounded-sm border border-border-strong bg-surface font-mono text-[1.0625em] font-medium text-fg"
                >
                  {d}
                </motion.li>
              ))}
            </ul>
            <CodeRing reduce={reduce} />
          </div>
        </Tile>
      </div>
    </Container>
  );
}
