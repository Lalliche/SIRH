import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ease } from "@/lib/motion-tokens";
import PreviewKpi from "../PreviewKpi";
import { staggerChild } from "../motion";
import { ATTENDANCE_COST, ATTENDANCE_TODAY, ATTENDANCE_ROWS } from "../mock-data";

const TONES = {
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  brand: "bg-primary-soft text-link",
};

export default function PointagePanel({ kpis, played }) {
  const max = Math.max(...ATTENDANCE_COST.map((s) => s.value));
  const r = 15.9;
  const circumference = 2 * Math.PI * r;
  const dash = (ATTENDANCE_TODAY.ring / 100) * circumference;

  return (
    <div className="flex flex-col gap-[0.7em] p-[0.9em]">
      <div className="grid grid-cols-2 gap-[0.6em] lg:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={staggerChild}>
            <PreviewKpi {...k} played={played} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-[0.6em] lg:grid-cols-[1.3fr_1fr]">
        <motion.div variants={staggerChild} className="rounded-lg border border-border bg-surface-2 px-[0.8em] py-[0.65em]">
          <p className="text-[0.6em] font-semibold uppercase tracking-[0.08em] text-fg-muted">Coût par service · octobre</p>
          <div className="mt-[0.5em] flex h-[5.4em] items-end gap-[0.5em]">
            {ATTENDANCE_COST.map((s, i) => (
              <div key={s.label} className="flex h-full flex-1 flex-col items-center justify-end gap-[0.25em]">
                <motion.span
                  className={cn("w-full origin-bottom rounded-t-xs", i === 0 ? "bg-primary" : "bg-pine-200")}
                  style={{ height: `${(s.value / max) * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: played ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: ease.emphasized, delay: 0.1 + i * 0.05 }}
                />
                <span className="text-[0.52em] text-fg-muted">{s.label}</span>
              </div>
            ))}
          </div>
          <ul className="mt-[0.6em] flex flex-col gap-[0.25em]">
            {ATTENDANCE_ROWS.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-[0.6em] rounded-md border border-border-subtle bg-surface px-[0.6em] py-[0.32em] text-[0.64em]">
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{row.name}</span>
                <span className="num shrink-0 font-mono text-fg-muted">{row.in} → {row.out}</span>
                <span className={cn("shrink-0 rounded-sm px-[0.45em] py-[0.08em] text-[0.9em] font-medium", TONES[row.tone])}>{row.status}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={staggerChild} className="flex flex-col items-center justify-center gap-[0.4em] rounded-lg border border-border bg-surface-2 px-[0.8em] py-[0.65em] text-center">
          <p className="text-[0.6em] font-semibold uppercase tracking-[0.08em] text-fg-muted">Présence aujourd&apos;hui</p>
          <div className="relative size-[4.6em]">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              <circle cx="18" cy="18" r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth="3.4" />
              <motion.circle
                cx="18"
                cy="18"
                r={r}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: played ? circumference - dash : circumference }}
                transition={{ duration: 0.9, ease: ease.out, delay: 0.2 }}
              />
            </svg>
            <span className="num absolute inset-0 grid place-items-center font-display text-[1.05em] font-semibold text-fg">{ATTENDANCE_TODAY.ring}%</span>
          </div>
          <dl className="flex gap-[0.8em] text-[0.58em]">
            <div>
              <dt className="text-fg-muted">Présents</dt>
              <dd className="num font-semibold text-fg">{ATTENDANCE_TODAY.present}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Retards</dt>
              <dd className="num font-semibold text-fg">{ATTENDANCE_TODAY.late}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Absents</dt>
              <dd className="num font-semibold text-fg">{ATTENDANCE_TODAY.absent}</dd>
            </div>
          </dl>
          <p className="font-mono text-[0.54em] text-fg-faint">Terminaux ZKTeco · dernière synchro 08:12</p>
        </motion.div>
      </div>
    </div>
  );
}
