"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, FileText, Landmark, Mail, Smartphone } from "lucide-react";
import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";
import { Badge, Button, Card, Segmented } from "@/components/ui";
import { DA, FLOW_LOCALE, flowInt, flowTiming } from "../_b/numberflow";
import { pricing, TVA_RATE, ANNUAL_MONTHS_BILLED } from "@/content/pricing";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion-tokens";

const methodIcons = { Virement: Landmark, Chèque: FileText, CCP: Mail, Baridimob: Smartphone };

function priceOf(ht, tax, billing) {
  const monthly = tax === "ttc" ? ht * (1 + TVA_RATE) : ht;
  const perMonth = billing === "yearly" ? (monthly * ANNUAL_MONTHS_BILLED) / 12 : monthly;
  return { monthly: Math.round(monthly), perMonth: Math.round(perMonth), yearTotal: Math.round(monthly * ANNUAL_MONTHS_BILLED) };
}

/** Tier cards with Mensuel/Annuel and HT/TTC toggles. `showHeader` is the landing variant's top row of controls. */
export default function PricingTiers({ header, linkToPage = false }) {
  const [billing, setBilling] = useState("monthly");
  const [tax, setTax] = useState("ht");
  const yearly = billing === "yearly";
  const suffixTax = tax === "ttc" ? "TTC" : "HT";

  return (
    <Container>
      <div className="flex flex-col gap-[3em]">
        <div className="flex flex-col justify-between gap-[2em] lg:flex-row lg:items-end">
          {header}
          <div className="flex flex-wrap items-center gap-[1em]">
            <div className="flex flex-col gap-[0.4em]">
              <span className="text-[0.75em] font-medium text-fg-muted">{pricing.billing.label}</span>
              <div className="flex items-center gap-[0.75em]">
                <Segmented value={billing} onChange={setBilling} options={pricing.billing.options} />
                <AnimatePresence initial={false}>
                  {yearly && (
                    <motion.span key="chip" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring.toggle}>
                      <Badge tone="success">{pricing.billing.yearlyChip}</Badge>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex flex-col gap-[0.4em]">
              <span className="text-[0.75em] font-medium text-fg-muted">{pricing.tax.label}</span>
              <div className="flex items-center gap-[0.75em]">
                <Segmented value={tax} onChange={setTax} options={pricing.tax.options} />
                <AnimatePresence initial={false}>
                  {tax === "ttc" && (
                    <motion.span key="tva" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[0.8125em] text-fg-muted">
                      {pricing.tax.note}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <ul className="grid items-stretch gap-[1.25em] md:grid-cols-3">
          {pricing.tiers.map((tier, i) => {
            const p = priceOf(tier.monthlyHt, tax, billing);
            return (
              <Reveal as="li" key={tier.id} delay={i * 0.08} className="flex">
                <Card
                  as="article"
                  aria-labelledby={`tier-${tier.id}`}
                  className={cn("relative flex w-full flex-col gap-[1.5em] p-[1.75em]", tier.highlighted && "border-t-[2px] border-t-primary shadow-md")}
                >
                  <div className="flex flex-col gap-[0.5em]">
                    <div className="flex items-center justify-between gap-[0.75em]">
                      <h3 id={`tier-${tier.id}`} className="font-display text-[1.375em] font-semibold tracking-[-0.015em] text-fg">{tier.name}</h3>
                      {tier.highlighted && <Badge tone="brand">{pricing.highlightBadge}</Badge>}
                    </div>
                    <p className="font-mono text-code text-fg-muted">{tier.range}</p>
                    <p className="min-h-[3em] text-fg-secondary text-pretty">{tier.pitch}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-[0.4em]">
                      <NumberFlow
                        value={p.perMonth}
                        locales={FLOW_LOCALE}
                        format={flowInt}
                        suffix={DA}
                        className="num font-display text-[2.5em] font-semibold leading-none tracking-[-0.03em] text-fg"
                        {...flowTiming}
                      />
                    </div>
                    <p className="mt-[0.4em] text-sm text-fg-muted">
                      <span className="font-medium text-fg-secondary">{suffixTax}</span> · par mois
                      {yearly && <span className="ms-[0.4em] line-through decoration-fg-faint">{money(p.monthly, { decimals: 0 })}</span>}
                    </p>
                    <p className="mt-[0.2em] min-h-[1.5em] text-[0.8125em] text-fg-muted">
                      {yearly ? pricing.perYear.replace("{amount}", money(p.yearTotal, { decimals: 0 })) : pricing.perMonthBilled}
                    </p>
                  </div>

                  <Button href="/contact" variant={tier.highlighted ? "primary" : "secondary"} size="lg" iconEnd={ArrowRight} className="w-full">
                    {tier.cta}
                  </Button>

                  <ul className="mt-auto flex flex-col gap-[0.7em] border-t border-border pt-[1.25em]">
                    {tier.features.map((f, fi) => {
                      const lead = f.endsWith(":");
                      return (
                        <li key={f} className={cn("flex gap-[0.6em] text-sm", lead ? "font-medium text-fg" : "text-fg-secondary")}>
                          {!lead && <Check aria-hidden className="mt-[0.2em] size-[1.1em] shrink-0 text-pine-600" strokeWidth={2} />}
                          {f}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </Reveal>
            );
          })}
        </ul>

        <div className="flex flex-col gap-[1.25em] border-y border-border py-[1.5em] md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-medium text-fg">{pricing.payment.title}</h3>
            <p className="mt-[0.25em] max-w-[52ch] text-sm text-fg-muted text-pretty">{pricing.payment.note}</p>
          </div>
          <ul className="flex flex-wrap gap-[0.5em]">
            {pricing.payment.methods.map((m) => (
              <li key={m}><Badge tone="neutral" icon={methodIcons[m]}>{m}</Badge></li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-[1em] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-fg-secondary">{pricing.beyond}</p>
          {linkToPage && <Button href="/tarifs" variant="ghost" iconEnd={ArrowRight}>Comparer les offres en détail</Button>}
        </div>
        <p className="-mt-[1.5em] text-[0.75em] text-fg-faint">{pricing.fine}</p>
      </div>
    </Container>
  );
}
