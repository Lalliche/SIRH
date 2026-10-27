"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { amount } from "@/lib/format";
import Stamp from "@/components/ui/Stamp";
import { ease } from "@/lib/motion-tokens";
import PreviewKpi from "../PreviewKpi";
import { STEPS, PREFLIGHT, PAYROLL_LINES, PAYROLL_TOTALS } from "../mock-data";
import { staggerChild } from "../motion";

/**
 * The "necessity" beat: a scripted, once-only pre-flight story — an error flags, gets checked, resolves, and the
 * cachet lands. It shows the problem SIRH solves (an error that would otherwise ship) rather than decorating.
 * Fires once per reveal (`played`), never loops, collapses to its end state under reduced motion.
 */
function PreflightCard({ played, reduce }) {
  const [beat, setBeat] = useState(reduce ? 3 : 0); // 0 idle, 1 flagged, 2 checking, 3 resolved

  useEffect(() => {
    if (!played || reduce) return;
    const timers = [
      setTimeout(() => setBeat(1), 500),
      setTimeout(() => setBeat(2), 1100),
      setTimeout(() => setBeat(3), 1600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [played, reduce]);

  const resolved = beat >= 3;

  return (
    <motion.div variants={staggerChild} className="relative rounded-lg border border-border bg-surface-2 px-[0.8em] py-[0.65em]">
      <div className="flex items-center justify-between gap-[1em]">
        <p className="text-[0.6em] font-semibold uppercase tracking-[0.08em] text-fg-muted">Contrôle avant paie</p>
        <p className={cn("text-[0.62em] font-medium transition-colors duration-200", resolved ? "text-success-fg" : "text-warning-fg")}>
          {resolved ? "1 écart corrigé · 0 bloquant" : "1 écart détecté"}
        </p>
      </div>
      <div
        className={cn(
          "relative mt-[0.45em] flex items-center gap-[0.6em] rounded-md border-s-2 py-[0.4em] pe-[0.5em] ps-[0.6em] text-[0.74em] transition-colors duration-200",
          resolved ? "border-primary bg-primary-soft/40" : "border-warning bg-warning-bg/50",
        )}
      >
        <span aria-hidden className={cn("grid size-[1.3em] shrink-0 place-items-center rounded-full", resolved ? "bg-primary text-primary-fg" : "bg-warning text-white")}>
          {resolved ? <Check className="size-[0.85em]" strokeWidth={3} /> : <AlertTriangle className="size-[0.8em]" strokeWidth={2.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-fg">{PREFLIGHT.row.label}</span>
          <span className="block truncate text-fg-muted">{resolved ? "Vérifié et validé" : PREFLIGHT.row.detail}</span>
        </span>
        <AnimatePresence>
          {beat === 2 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: ease.out }}
              className="shrink-0 rounded-sm bg-primary-soft px-[0.5em] py-[0.15em] text-[0.85em] font-medium text-link"
            >
              {PREFLIGHT.action}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {resolved && !reduce && (
          <div className="pointer-events-none absolute end-[0.6em] top-1/2 -translate-y-1/2">
            <Stamp label="OK" className="size-[2.6em] text-[0.4em]" />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PayrollTable() {
  const cols = "grid-cols-[1.6fr_0.9fr_0.7fr_0.7fr_0.9fr]";
  return (
    <motion.div variants={staggerChild} className="overflow-hidden rounded-lg border border-border bg-surface-2">
      <div className={cn("grid gap-[0.6em] border-b border-border-subtle bg-bg-sunken px-[0.8em] py-[0.4em] text-[0.56em] font-semibold uppercase tracking-[0.08em] text-fg-muted", cols)}>
        <span>Salarié</span>
        <span className="text-end">Brut</span>
        <span className="text-end">CNAS</span>
        <span className="text-end">IRG</span>
        <span className="text-end">Net à payer</span>
      </div>
      {PAYROLL_LINES.map((l) => (
        <div key={l.name} className={cn("grid items-center gap-[0.6em] border-b border-border-subtle px-[0.8em] py-[0.35em] text-[0.66em] last:border-0", cols)}>
          <span className="min-w-0">
            <span className="block truncate font-medium text-fg">{l.name}</span>
            <span className="block truncate text-[0.85em] text-fg-muted">{l.job}</span>
          </span>
          <span className="num text-end text-fg-secondary">{amount(l.gross, { decimals: 0 })}</span>
          <span className="num text-end text-fg-muted">−{amount(l.cnas, { decimals: 0 })}</span>
          <span className="num text-end text-fg-muted">−{amount(l.irg, { decimals: 0 })}</span>
          <span className="num text-end font-semibold text-fg">{amount(l.net, { decimals: 0 })}</span>
        </div>
      ))}
      <div className={cn("grid gap-[0.6em] border-t-[3px] border-double border-border-strong bg-pine-50 px-[0.8em] py-[0.4em] text-[0.66em] font-semibold", cols)}>
        <span className="text-fg">Total · 49 salariés</span>
        <span className="num text-end text-fg">{amount(PAYROLL_TOTALS.gross, { decimals: 0 })}</span>
        <span className="num text-end text-fg-secondary">−{amount(PAYROLL_TOTALS.cnas, { decimals: 0 })}</span>
        <span className="num text-end text-fg-secondary">−{amount(PAYROLL_TOTALS.irg, { decimals: 0 })}</span>
        <span className="num text-end text-fg">{amount(PAYROLL_TOTALS.net, { decimals: 0 })}</span>
      </div>
    </motion.div>
  );
}

export default function PaiePanel({ kpis, played, reduce }) {
  return (
    <div className="flex flex-col gap-[0.7em] p-[0.9em]">
      <div className="grid grid-cols-2 gap-[0.6em] lg:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={staggerChild}>
            <PreviewKpi {...k} played={played} />
          </motion.div>
        ))}
      </div>

      <motion.div variants={staggerChild} className="rounded-lg border border-border bg-surface-2 px-[0.8em] py-[0.65em]">
        <div className="mb-[0.55em] flex items-center justify-between gap-[1em]">
          <p className="text-[0.6em] font-semibold uppercase tracking-[0.08em] text-fg-muted">Paie d&apos;octobre 2026</p>
          <p className="font-mono text-[0.6em] text-fg-muted">Étape 3 sur 5 · échéance 05/11</p>
        </div>
        <ol className="relative flex justify-between">
          <span aria-hidden className="absolute inset-x-[0.7em] top-[0.65em] h-px bg-border" />
          <motion.span
            aria-hidden
            className="absolute inset-x-[0.7em] top-[0.65em] h-px origin-left bg-primary"
            style={{ width: "calc(100% - 1.4em)" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: played ? 0.5 : 0 }}
            transition={{ duration: 0.8, ease: ease.inOut, delay: 0.1 }}
          />
          {STEPS.map((s) => (
            <li key={s.label} className="relative flex w-[4em] flex-col items-center gap-[0.3em]">
              <span
                className={cn(
                  "flex size-[1.3em] items-center justify-center rounded-full border text-[0.6em]",
                  s.state === "done" && "border-primary bg-primary text-primary-fg",
                  s.state === "current" && "border-primary bg-surface text-primary shadow-[0_0_0_0.25em_var(--primary-soft)]",
                  s.state === "todo" && "border-border-strong bg-surface text-fg-faint",
                )}
              >
                {s.state === "done" ? <Check className="size-[0.9em]" strokeWidth={3} aria-hidden /> : <span className="size-[0.4em] rounded-full bg-current" />}
              </span>
              <span className={cn("text-center text-[0.58em] leading-tight", s.state === "current" ? "font-semibold text-fg" : "text-fg-muted")}>{s.label}</span>
            </li>
          ))}
        </ol>
      </motion.div>

      <PayrollTable />
      <PreflightCard played={played} reduce={reduce} />
    </div>
  );
}
