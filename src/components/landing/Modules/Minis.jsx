"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Check, FileText, Lock } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Avatar, Badge } from "@/components/ui";
import Stamp from "@/components/ui/Stamp";
import { HATCH } from "@/components/shared/hatch";
import { lpDur, lpEase, lpStep } from "@/components/motion/landing-tokens";
import { draw, miniItem, miniParent, useMini } from "./useMini";

/* ---------- Paie: the payslip prints, rows one by one, net rolls ---------- */
export function PaieMini({ t }) {
  const { ref, inView, initial, animate } = useMini();
  return (
    <div ref={ref} className="relative mx-auto flex h-full w-full max-w-[19em] flex-col items-center">
      <span aria-hidden className="relative z-10 h-[0.7em] w-full rounded-pill bg-pine-800 shadow-sm" />
      <div className="relative -mt-[0.2em] w-[88%] flex-1 overflow-hidden">
        <motion.div
          initial={initial}
          animate={animate}
          variants={{ hidden: { y: "-85%" }, visible: { y: "0%", transition: { duration: lpDur.draw, ease: lpEase.inOut, delay: 0.1 } } }}
          className="rounded-b-sm border border-t-0 border-border bg-surface px-[1em] pb-[1em] pt-[1.2em] text-[0.82em] shadow-md"
        >
          <p className="mb-[0.6em] font-mono text-[0.75em] uppercase tracking-[0.1em] text-fg-muted">{t.printer}</p>
          <motion.div initial={initial} animate={animate} variants={miniParent(lpStep.items, 0.5)} className="space-y-[0.4em]">
            {t.rows.map(([label, value]) => (
              <motion.p key={label} variants={miniItem} className="flex items-baseline gap-[0.5em]">
                <span>{label}</span>
                <span aria-hidden className="h-0 flex-1 border-b border-dotted border-border-strong" />
                <span className="num text-fg-secondary">{value}</span>
              </motion.p>
            ))}
          </motion.div>
          <motion.span
            aria-hidden
            initial={initial}
            animate={animate}
            variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: lpDur.bar, ease: lpEase.emphasized, delay: 1.1 } } }}
            className="mt-[0.8em] block h-[0.4em] origin-left rounded-pill bg-pine-600"
          />
          <p className="mt-[0.6em] flex items-baseline justify-between border-t-[3px] border-double border-border-strong pt-[0.4em] font-semibold">
            <span>{t.net}</span>
            <span className="font-display text-[1.5em] tracking-[-0.02em]">
              <NumberFlow value={inView ? 86540 : 0} locales="fr-FR" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} suffix=" DA" transformTiming={{ duration: lpDur.count * 1000, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- Dossier: org chart, connectors draw ---------- */
const EDGES = ["M120 42 C120 74 40 68 40 96", "M120 42 V96", "M120 42 C120 74 200 68 200 96"];
const CHILD_X = [40, 120, 200];

export function DossierMini({ t }) {
  const { ref, initial, animate } = useMini();
  return (
    <div ref={ref} className="flex h-full flex-col items-center justify-between gap-[0.6em]">
      <motion.svg viewBox="0 0 240 150" initial={initial} animate={animate} variants={miniParent(lpStep.items, 0.05)} className="w-full max-w-[19em]" role="img" aria-label={t.root}>
        {EDGES.map((d, i) => (
          <motion.path key={d} d={d} fill="none" strokeWidth={1.5} className="stroke-border-strong" variants={draw(i * 0.12)} />
        ))}
        <motion.g variants={miniItem}>
          <circle cx="120" cy="27" r="16" className="fill-primary" />
          <text x="120" y="31" textAnchor="middle" className="fill-primary-fg text-[10px] font-semibold">{t.root}</text>
        </motion.g>
        {t.children.map(([short, label], i) => (
          <motion.g key={short} variants={miniItem}>
            <circle cx={CHILD_X[i]} cy="112" r="16" className="fill-surface stroke-primary" strokeWidth={1.5} />
            <text x={CHILD_X[i]} y="115.5" textAnchor="middle" className="fill-fg text-[8px] font-semibold">{short}</text>
            <text x={CHILD_X[i]} y="140" textAnchor="middle" className="fill-fg-muted text-[8px]">{label}</text>
          </motion.g>
        ))}
      </motion.svg>
      <motion.div initial={initial} animate={animate} variants={miniParent(lpStep.tight, 0.9)} className="flex items-center">
        {["Amina Haddad", "Karim Benali", "Sofiane Mebarki", "Lynda Cherif"].map((n) => (
          <motion.span key={n} variants={{ hidden: { opacity: 0, x: "-1em" }, visible: { opacity: 1, x: "0em", transition: { duration: lpDur.slow, ease: lpEase.outStrong } } }} className="-ms-[0.7em] first:ms-0">
            <Avatar name={n} size="md" className="ring-2 ring-bg" />
          </motion.span>
        ))}
        <span className="num ms-[0.6em] text-xs font-medium text-fg-muted">{t.more}</span>
      </motion.div>
    </div>
  );
}

/* ---------- Congés: month grid, Fri/Sat hatched, a request is swept and approved ---------- */
const OFFSET = 4; // 1 Oct 2026 is a Thursday; weeks start on Sunday
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function CongesMini({ t }) {
  const { ref, initial, animate } = useMini();
  return (
    <div ref={ref} className="w-full">
      <p className="mb-[0.5em] flex items-baseline justify-between text-xs">
        <span className="font-semibold text-fg">{t.month}</span>
        <span className="text-fg-muted">{t.hatchNote}</span>
      </p>
      <motion.div initial={initial} animate={animate} variants={miniParent(lpStep.cells, 0.1)} className="relative grid grid-cols-7 gap-[0.2em] text-[0.7em]">
        {t.weekdays.map((d, i) => (
          <span key={d} className={cn("pb-[0.2em] text-center font-medium text-fg-muted", i >= 5 && "text-fg-faint")}>{d}</span>
        ))}
        {DAYS.map((d) => {
          const col = (OFFSET + d - 1) % 7;
          const row = Math.floor((OFFSET + d - 1) / 7);
          return (
            <motion.span
              key={d}
              style={{ gridColumnStart: col + 1, gridRowStart: row + 2 }}
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: lpDur.base } } }}
              className={cn("num relative flex h-[2.1em] items-center justify-center rounded-xs text-fg-secondary", col >= 5 ? HATCH : "border border-border-subtle bg-surface")}
            >
              {d}
              {d === 27 && <span aria-hidden className="absolute end-[0.25em] top-[0.25em] size-[0.45em] rounded-full bg-clay-600" />}
            </motion.span>
          );
        })}
        <motion.span
          aria-hidden
          variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: lpDur.draw, ease: lpEase.inOut, delay: 1 } } }}
          className="pointer-events-none relative z-10 col-span-5 col-start-1 row-start-5 origin-left self-stretch rounded-sm border border-chart-4 bg-chart-4/20"
        />
      </motion.div>
      <motion.p
        initial={initial}
        animate={animate}
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 2.1, duration: lpDur.base } } }}
        className="mt-[0.8em] flex items-center justify-between gap-[0.5em] text-xs"
      >
        <span className="text-fg-secondary">{t.request}</span>
        <motion.span variants={{ hidden: { scale: 0.9 }, visible: { scale: 1, transition: { delay: 2.1, ...{ duration: lpDur.base, ease: lpEase.outStrong } } } }}>
          <Badge tone="success" icon={Check}>{t.approved}</Badge>
        </motion.span>
      </motion.p>
    </div>
  );
}

/* ---------- Pointage: presence ring + clock-ins ---------- */
const DOT = { ok: "bg-success", late: "bg-warning", remote: "bg-info" };

export function PointageMini({ t }) {
  const { ref, initial, animate } = useMini();
  return (
    <div ref={ref} className="flex w-full items-center gap-[1.1em]">
      <motion.svg viewBox="0 0 64 64" initial={initial} animate={animate} className="size-[5.6em] shrink-0" role="img" aria-label={`${t.present} / ${t.total} ${t.ring}`}>
        <circle cx="32" cy="32" r="26" fill="none" strokeWidth="6" className="stroke-bg-sunken" />
        <g transform="rotate(-90 32 32)">
          <motion.circle cx="32" cy="32" r="26" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-primary" variants={{ hidden: { pathLength: 0 }, visible: { pathLength: t.present / t.total, transition: { duration: lpDur.draw, ease: lpEase.emphasized, delay: 0.1 } } }} />
        </g>
        <text x="32" y="31" textAnchor="middle" className="fill-fg font-display text-[14px] font-semibold">{t.present}</text>
        <text x="32" y="42" textAnchor="middle" className="fill-fg-muted text-[7px]">/ {t.total}</text>
      </motion.svg>
      <motion.ul initial={initial} animate={animate} variants={miniParent(lpStep.cards, 0.5)} className="min-w-0 flex-1 space-y-[0.5em] text-xs">
        {t.entries.map(([name, time, kind, label]) => (
          <motion.li key={name} variants={miniItem} className="flex items-center gap-[0.5em]">
            <span aria-hidden className={cn("size-[0.5em] shrink-0 rounded-full", DOT[kind])} />
            <span className="min-w-0 flex-1 truncate text-fg">{name}</span>
            <span className="num font-mono text-fg-secondary">{time}</span>
            <span className="hidden w-[5.4em] text-fg-muted xs:inline">{label}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

/* ---------- Prêts: repayment schedule ---------- */
export function PretsMini({ t }) {
  const { ref, initial, animate } = useMini();
  return (
    <div ref={ref} className="w-full">
      <p className="text-sm font-semibold text-fg">{t.title}</p>
      <p className="text-xs text-fg-muted">{t.detail}</p>
      <motion.ol initial={initial} animate={animate} variants={miniParent(lpStep.words, 0.2)} className="mt-[1em] flex h-[4.4em] items-end gap-[0.35em]" aria-label={t.progress}>
        {Array.from({ length: t.total }, (_, i) => (
          <motion.li
            key={i}
            variants={{ hidden: { scaleY: 0 }, visible: { scaleY: 1, transition: { duration: lpDur.bar, ease: lpEase.emphasized } } }}
            className={cn("h-full flex-1 origin-bottom rounded-t-xs", i < t.paid ? "bg-primary" : "border border-dashed border-border-strong bg-transparent")}
          />
        ))}
      </motion.ol>
      <p className="mt-[0.7em] flex items-center gap-[0.5em] text-xs text-fg-secondary">
        <Lock className="size-[1em]" aria-hidden strokeWidth={1.75} />
        {t.progress}
      </p>
    </div>
  );
}

/* ---------- Documents: a contract is signed and stamped ---------- */
export function DocumentsMini({ t }) {
  const { ref, initial, animate } = useMini();
  const [signed, setSigned] = useState(false);
  return (
    <div ref={ref} className="relative mx-auto h-full min-h-[10em] w-full max-w-[17em]">
      {t.files.slice(0, 2).map((f, i) => (
        <motion.div
          key={f}
          initial={initial}
          animate={animate}
          variants={{ hidden: { opacity: 0, y: "1em" }, visible: { opacity: 1, y: "0em", transition: { duration: lpDur.reveal, ease: lpEase.outStrong, delay: i * 0.1 } } }}
          className="absolute inset-x-0 flex items-center gap-[0.6em] rounded-lg border border-border bg-surface-2 px-[0.8em] py-[0.5em] text-xs text-fg-muted shadow-xs"
          style={{ top: `${i * 1.1}em`, marginInline: `${(1 - i) * 0.9 + 0.2}em` }}
        >
          <FileText className="size-[1.1em]" aria-hidden strokeWidth={1.5} />
          {f}
        </motion.div>
      ))}
      <motion.div
        initial={initial}
        animate={animate}
        variants={{ hidden: { opacity: 0, y: "1.2em" }, visible: { opacity: 1, y: "0em", transition: { duration: lpDur.reveal, ease: lpEase.outStrong, delay: 0.25 } } }}
        className="absolute inset-x-0 top-[2.6em] rounded-lg border border-border-strong bg-surface p-[0.9em] shadow-md"
      >
        <p className="flex items-center gap-[0.5em] text-xs font-semibold text-fg">
          <FileText className="size-[1.1em] text-link" aria-hidden strokeWidth={1.5} />
          {t.files[2]}
        </p>
        <div aria-hidden className="mt-[0.6em] space-y-[0.35em]">
          <span className="block h-[0.35em] w-full rounded-pill bg-bg-sunken" />
          <span className="block h-[0.35em] w-[82%] rounded-pill bg-bg-sunken" />
          <span className="block h-[0.35em] w-[64%] rounded-pill bg-bg-sunken" />
        </div>
        <div className="relative mt-[0.5em] flex h-[3.4em] items-end justify-between">
          <div>
            <svg viewBox="0 0 80 32" className="h-[2.4em] w-[6em]" aria-hidden>
              <motion.path
                d="M4 24 C10 4 16 4 14 20 S22 28 28 14 S36 6 38 20 S50 26 56 12 S66 8 76 22"
                fill="none"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="stroke-primary"
                variants={draw(0.9)}
                initial={initial}
                animate={animate}
                onAnimationComplete={() => animate === "visible" && setSigned(true)}
              />
            </svg>
            <p className="border-t border-border-strong pt-[0.2em] text-[0.62em] text-fg-muted">{t.signature}</p>
          </div>
          {signed && <Stamp label={t.signed.toUpperCase()} className="absolute -bottom-[0.6em] end-0 size-[4.4em] text-[0.6em]" />}
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Déclarations: exports and gaps ---------- */
export function DeclarationsMini({ t }) {
  const { ref, initial, animate } = useMini();
  return (
    <div ref={ref} className="w-full">
      <motion.ul initial={initial} animate={animate} variants={miniParent(lpStep.cards, 0.1)} className="divide-y divide-border-subtle rounded-lg border border-border bg-surface">
        {t.rows.map((r) => (
          <motion.li key={r.label} variants={miniItem} className="flex items-center justify-between gap-[0.6em] px-[0.8em] py-[0.6em] text-xs">
            <span className="flex items-center gap-[0.5em] font-medium text-fg">
              <FileText className="size-[1.1em] text-fg-muted" aria-hidden strokeWidth={1.5} />
              {r.label}
            </span>
            <Badge tone={r.tone}>{r.status}</Badge>
          </motion.li>
        ))}
      </motion.ul>
      <span aria-hidden className="mt-[0.9em] block h-[0.35em] overflow-hidden rounded-pill bg-bg-sunken">
        <motion.span
          initial={initial}
          animate={animate}
          variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 0.84, transition: { duration: lpDur.draw, ease: lpEase.emphasized, delay: 0.6 } } }}
          className="block h-full origin-left rounded-pill bg-primary"
        />
      </span>
    </div>
  );
}

export const MINIS = { paie: PaieMini, dossier: DossierMini, conges: CongesMini, pointage: PointageMini, prets: PretsMini, documents: DocumentsMini, declarations: DeclarationsMini };
