"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BellRing, CalendarPlus, Check, FileDown, Signal, Wifi } from "lucide-react";
import { Button } from "@/components/ui";
import { ARCH } from "../_b/arch";
import { flowTiming, FLOW_LOCALE, flowInt } from "../_b/numberflow";
import { selfservice } from "@/content/selfservice";
import { workingDays } from "@/lib/dates";
import { amount } from "@/lib/format";
import { duration, ease, spring } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

const p = selfservice.phone;
const periods = p.periods.map((x) => ({ ...x, days: workingDays(x.from, x.to) }));

/** Interactive employee-app mock built from DOM: request leave -> confirmation, download a payslip. */
export default function PhoneDemo() {
  const reduce = useReducedMotion();
  const frameRef = useRef(null);
  const timers = useRef([]);
  const [sheet, setSheet] = useState(false);
  const [choice, setChoice] = useState(periods[0].id);
  const [requested, setRequested] = useState(null); // { days, label }
  const [toastOn, setToastOn] = useState(false);
  const [downloads, setDownloads] = useState({}); // id -> "loading" | "done"

  const { scrollYProgress } = useScroll({ target: frameRef, offset: ["start end", "end start"] });
  const archY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [36, -36]);
  const phoneY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-14, 14]);

  const later = (fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const selected = periods.find((x) => x.id === choice);
  const balance = p.balance - (requested?.days ?? 0);

  function send() {
    setRequested({ days: selected.days, label: selected.label });
    setSheet(false);
    setToastOn(true);
    later(() => setToastOn(false), 4200);
  }
  function download(id) {
    if (downloads[id]) return;
    setDownloads((d) => ({ ...d, [id]: "loading" }));
    later(() => setDownloads((d) => ({ ...d, [id]: "done" })), 1100);
  }
  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSheet(false);
    setRequested(null);
    setToastOn(false);
    setDownloads({});
    setChoice(periods[0].id);
  }

  const touched = !!requested || Object.keys(downloads).length > 0;

  return (
    <div ref={frameRef} className="relative mx-auto flex w-full max-w-[26em] justify-center pb-[1em] pt-[2em]">
      {/* arch backdrop */}
      <motion.div aria-hidden style={{ y: archY }} className={cn("absolute inset-x-[1em] top-0 bottom-[1em] border border-pine-200 bg-primary-soft", ARCH)}>
        <div className={cn("absolute inset-[0.9em] border border-pine-300/50", ARCH)} />
      </motion.div>

      <motion.div style={{ y: phoneY }} className="relative w-[19em] shrink-0">
        <div className="relative aspect-[9/18.5] overflow-hidden rounded-[2.6em] border-[5px] border-pine-900 bg-surface-2 shadow-lg">
          {/* status bar */}
          <div aria-hidden className="relative flex items-center justify-between px-[1.6em] pb-[0.4em] pt-[0.9em] text-[0.7em] font-semibold text-fg">
            <span className="font-mono">09:41</span>
            <span className="absolute start-1/2 top-[0.7em] h-[1.5em] w-[5.5em] -translate-x-1/2 rounded-full bg-pine-900" />
            <span className="flex items-center gap-[0.35em]">
              <Signal className="size-[1.2em]" strokeWidth={2} />
              <Wifi className="size-[1.2em]" strokeWidth={2} />
            </span>
          </div>

          <div className="flex flex-col gap-[0.9em] px-[1.1em] pb-[1em] text-[0.85em]">
            {/* greeting */}
            <div className="flex items-center gap-[0.75em] pt-[0.4em]">
              <span aria-hidden className={cn("grid h-[3em] w-[2.5em] place-items-center bg-pine-700 font-display text-[1em] font-semibold text-pine-50", ARCH)}>AH</span>
              <div className="min-w-0">
                <p className="truncate text-[1.05em] font-semibold text-fg">{p.greeting}</p>
                <p className="truncate text-[0.8em] text-fg-muted">{p.role}</p>
              </div>
            </div>

            {/* leave balance */}
            <div className="rounded-lg border border-border bg-surface p-[0.9em] shadow-sm">
              <div className="flex items-center gap-[1em]">
                <div className="relative size-[5.2em] shrink-0">
                  <svg viewBox="0 0 48 48" className="size-full -rotate-90" aria-hidden>
                    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="5" />
                    <motion.circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={false}
                      animate={{ pathLength: balance / p.total }}
                      transition={reduce ? { duration: 0 } : spring.soft}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center leading-none">
                    <div>
                      <NumberFlow value={balance} locales={FLOW_LOCALE} format={flowInt} className="font-display text-[1.7em] font-semibold text-fg" {...flowTiming} />
                      <p className="mt-[0.2em] text-[0.7em] text-fg-muted">{p.unit}</p>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.85em] leading-snug text-fg-secondary">{p.balanceLabel}</p>
                  <AnimatePresence initial={false}>
                    {requested && (
                      <motion.p
                        key="pending"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: duration.panel, ease: ease.out }}
                        className="mt-[0.5em] inline-flex items-center gap-[0.4em] rounded-sm bg-warning-bg px-[0.5em] py-[0.2em] text-[0.75em] font-medium text-warning-fg"
                      >
                        <span aria-hidden className="size-[0.5em] rounded-full bg-warning" />
                        {p.pendingBadge} · {requested.days} j
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="relative">
              {!touched && !reduce && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -inset-[0.3em] rounded-lg border-2 border-primary"
                  animate={{ opacity: [0.7, 0], scale: [1, 1.06] }}
                  transition={{ duration: duration.reveal * 3, ease: ease.out, repeat: Infinity }}
                />
              )}
              <Button icon={CalendarPlus} size="md" className="w-full" onClick={() => setSheet(true)} disabled={sheet || !!requested}>
                {p.request}
              </Button>
            </div>

            {/* payslips */}
            <div>
              <p className="mb-[0.5em] text-[0.8em] font-semibold uppercase tracking-[0.06em] text-fg-muted">{p.payslipsTitle}</p>
              <ul className="flex flex-col gap-[0.5em]">
                {p.payslips.map((s) => {
                  const state = downloads[s.id];
                  return (
                    <li key={s.id} className="flex items-center gap-[0.75em] rounded-lg border border-border bg-surface px-[0.8em] py-[0.6em]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-fg">{s.period}</p>
                        <p className="font-mono text-[0.8em] text-fg-muted">Net {amount(s.net, { decimals: 0 })} DA</p>
                      </div>
                      {state === "done" ? (
                        <span className="inline-flex items-center gap-[0.35em] text-[0.8em] font-medium text-success-fg">
                          <Check className="size-[1.2em]" aria-hidden strokeWidth={2.25} />
                          {p.downloaded}
                        </span>
                      ) : (
                        <Button
                          size="icon"
                          variant="soft"
                          loading={state === "loading"}
                          icon={FileDown}
                          aria-label={`${p.downloadLabel} le bulletin de ${s.period}`}
                          onClick={() => download(s.id)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* bottom sheet: request leave */}
          <AnimatePresence>
            {sheet && (
              <>
                <motion.div key="scrim" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.base }} onClick={() => setSheet(false)} className="absolute inset-0 bg-overlay" />
                <motion.div
                  key="sheet"
                  role="dialog"
                  aria-label={p.sheetTitle}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={spring.snappy}
                  className="absolute inset-x-0 bottom-0 flex flex-col gap-[0.75em] rounded-t-[1.6em] bg-surface px-[1.2em] pb-[1.4em] pt-[1em] text-[0.85em] shadow-lg"
                >
                  <span aria-hidden className="mx-auto h-[0.3em] w-[3em] rounded-full bg-border-strong" />
                  <p className="font-display text-[1.2em] font-semibold text-fg">{p.sheetTitle}</p>
                  <p className="text-[0.85em] text-fg-muted">{p.sheetHint}</p>
                  <div className="flex flex-col gap-[0.4em]" role="radiogroup" aria-label="Période">
                    {periods.map((x) => (
                      <Button
                        key={x.id}
                        size="md"
                        role="radio"
                        aria-checked={choice === x.id}
                        variant={choice === x.id ? "soft" : "secondary"}
                        className="w-full justify-between"
                        onClick={() => setChoice(x.id)}
                      >
                        <span>{x.label}</span>
                        <span className="font-mono text-[0.85em]">{x.days} j ouvrés</span>
                      </Button>
                    ))}
                  </div>
                  <div className="mt-[0.25em] flex gap-[0.5em]">
                    <Button variant="ghost" onClick={() => setSheet(false)}>{p.cancel}</Button>
                    <Button className="flex-1" onClick={send}>{p.confirm}</Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* toast */}
          <AnimatePresence>
            {toastOn && requested && (
              <motion.div
                key="toast"
                role="status"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={spring.snappy}
                className="absolute inset-x-[0.9em] top-[3.2em] flex items-start gap-[0.7em] rounded-lg border border-border bg-surface p-[0.8em] text-[0.8em] shadow-lg"
              >
                <span aria-hidden className="grid size-[1.9em] shrink-0 place-items-center rounded-full bg-success-bg text-success-fg">
                  <Check className="size-[1.1em]" strokeWidth={2.5} />
                </span>
                <p className="text-fg">
                  <span className="font-semibold">Demande envoyée</span> à {p.manager} · {requested.label}, {requested.days} jours ouvrés.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* floating notification chip */}
        <motion.div
          aria-hidden
          initial={reduce ? false : { opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: duration.reveal, ease: ease.out, delay: 0.4 }}
          className="absolute -end-[2.2em] top-[11em] hidden items-center gap-[0.6em] rounded-lg border border-border bg-surface px-[0.8em] py-[0.6em] text-[0.8em] shadow-md sm:flex"
        >
          <BellRing className="size-[1.2em] text-link" strokeWidth={1.75} />
          <span className="font-medium text-fg">Bulletin disponible</span>
        </motion.div>
      </motion.div>

      <div className="absolute inset-x-0 -bottom-[2.2em] flex justify-center">
        {touched ? (
          <Button size="sm" variant="ghost" onClick={reset}>{p.reset}</Button>
        ) : (
          <p className="text-sm text-fg-muted">{selfservice.hint}</p>
        )}
      </div>
    </div>
  );
}
