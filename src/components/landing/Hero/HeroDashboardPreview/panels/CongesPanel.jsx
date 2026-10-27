import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { HATCH } from "@/components/shared/hatch";
import PreviewKpi from "../PreviewKpi";
import { staggerChild } from "../motion";
import { LEAVE_CALENDAR, LEAVE_REQUESTS, LEAVE_BALANCES } from "../mock-data";

const TONES = {
  warning: "bg-warning-bg text-warning-fg",
  success: "bg-success-bg text-success-fg",
  brand: "bg-primary-soft text-link",
};

export default function CongesPanel({ kpis, played }) {
  return (
    <div className="flex flex-col gap-[0.7em] p-[0.9em]">
      <div className="grid grid-cols-2 gap-[0.6em] lg:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={staggerChild}>
            <PreviewKpi {...k} played={played} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-[0.6em] lg:grid-cols-[1fr_1.1fr]">
        <motion.div variants={staggerChild} className="rounded-lg border border-border bg-surface-2 px-[0.8em] py-[0.65em]">
          <div className="mb-[0.5em] flex items-center justify-between gap-[0.6em]">
            <p className="text-[0.6em] font-semibold uppercase tracking-[0.08em] text-fg-muted">Octobre — novembre 2026</p>
            <p className="font-mono text-[0.58em] text-fg-muted">Ven. et sam. exclus</p>
          </div>
          <div className="grid grid-cols-7 gap-[0.2em]">
            {LEAVE_CALENDAR.weekdays.map((w, i) => (
              <span key={i} className="pb-[0.15em] text-center text-[0.52em] font-medium text-fg-faint">{w}</span>
            ))}
            {LEAVE_CALENDAR.days.map((d, i) => {
              const weekend = i % 7 >= 5;
              return (
                <span
                  key={i}
                  className={cn(
                    "num flex h-[1.7em] items-center justify-center rounded-xs text-[0.58em] text-fg-secondary",
                    weekend ? cn(HATCH, "text-fg-faint") : "border border-border-subtle bg-surface",
                    LEAVE_CALENDAR.absent.has(d) && !weekend && "border-chart-4/30 bg-chart-4/15 text-fg",
                    d === LEAVE_CALENDAR.today && "font-semibold text-primary shadow-[0_0_0_0.12em_var(--primary)]",
                  )}
                >
                  {d}
                </span>
              );
            })}
          </div>
          <ul className="mt-[0.6em] flex flex-col gap-[0.3em]">
            {LEAVE_BALANCES.map((b) => (
              <li key={b.label} className="flex items-center gap-[0.5em] text-[0.6em]">
                <span className="w-[6.5em] shrink-0 text-fg-secondary">{b.label}</span>
                <span className="h-[0.4em] flex-1 overflow-hidden rounded-full bg-bg-sunken">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(b.used / b.total) * 100}%` }} />
                </span>
                <span className="num shrink-0 font-mono text-fg-muted">{b.used}/{b.total} j</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={staggerChild} className="flex flex-col rounded-lg border border-border bg-surface-2 px-[0.8em] py-[0.65em]">
          <p className="mb-[0.5em] text-[0.6em] font-semibold uppercase tracking-[0.08em] text-fg-muted">File d&apos;approbation</p>
          <ul className="flex flex-1 flex-col gap-[0.35em]">
            {LEAVE_REQUESTS.map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-[0.6em] rounded-md border border-border-subtle bg-surface px-[0.6em] py-[0.42em] text-[0.68em]">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{r.name}</span>
                  <span className="block truncate text-[0.88em] text-fg-muted">{r.type} · {r.range}</span>
                </span>
                <span className={cn("num shrink-0 rounded-sm px-[0.45em] py-[0.1em] font-mono text-[0.85em] font-medium", TONES[r.tone])}>{r.days}</span>
              </li>
            ))}
          </ul>
          <p className="mt-[0.55em] flex flex-wrap items-center gap-[0.4em] text-[0.56em] text-fg-faint">
            <kbd className="rounded-xs border border-border bg-bg-sunken px-[0.4em] py-[0.05em] font-mono">J</kbd>
            <kbd className="rounded-xs border border-border bg-bg-sunken px-[0.4em] py-[0.05em] font-mono">K</kbd>
            naviguer ·
            <kbd className="rounded-xs border border-border bg-bg-sunken px-[0.4em] py-[0.05em] font-mono">A</kbd>
            approuver ·
            <kbd className="rounded-xs border border-border bg-bg-sunken px-[0.4em] py-[0.05em] font-mono">R</kbd>
            refuser
          </p>
        </motion.div>
      </div>
    </div>
  );
}
