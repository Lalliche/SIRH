"use client";

import { useEffect, useId, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { AlertTriangle, Info } from "lucide-react";
import { Badge, Button, Segmented, TextInput, Toggle } from "@/components/ui";
import Reveal from "@/components/motion/Reveal";
import { DA, FLOW_LOCALE, flowInt, flowPercent, flowTiming } from "../_b/numberflow";
import { useDebouncedValue } from "../_b/useDebouncedValue";
import { simulator } from "@/content/simulator";
import { grossToNet, netToGross, defaultParams } from "@/lib/payroll";
import { int, money, periodLabel } from "@/lib/format";
import { follow } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

const MAX_INPUT = 9999999;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function Flow({ value, percent = false, className }) {
  return (
    <NumberFlow
      value={value}
      locales={FLOW_LOCALE}
      format={percent ? flowPercent : flowInt}
      suffix={percent ? undefined : DA}
      className={cn("num", className)}
      {...flowTiming}
    />
  );
}

/** Spring-eased fraction. Jumps (no easing) under reduced motion. */
function useFraction(target, reduce) {
  const raw = useMotionValue(target);
  const spring = useSpring(raw, follow.slider);
  useEffect(() => {
    raw.set(target);
    if (reduce) spring.jump(target);
  }, [target, reduce, raw, spring]);
  return spring;
}

function Line({ label, children, sign, strong, muted }) {
  return (
    <div className={cn("flex items-baseline gap-[0.6em] py-[0.35em]", strong && "font-semibold")}>
      <dt className={cn(muted ? "text-fg-muted" : "text-fg-secondary", strong && "text-fg")}>{label}</dt>
      <span aria-hidden className="mb-[0.3em] min-w-[1em] flex-1 border-b border-dotted border-border-strong" />
      <dd className={cn("flex shrink-0 items-baseline gap-[0.3em] text-fg", muted && "text-fg-secondary")}>
        {sign && <span aria-hidden className="text-fg-muted">{sign}</span>}
        {children}
      </dd>
    </div>
  );
}

/**
 * Reusable gross <-> net simulator (landing #simulateur and /simulateur-irg).
 * Engine: src/lib/payroll.js (grossToNet / netToGross). Estimation only.
 */
export default function PayrollSimulator({ className }) {
  const reduce = useReducedMotion();
  const sliderId = useId();
  const [mode, setMode] = useState("gross");
  const [value, setValue] = useState(simulator.inputs.gross.initial);
  const [showEmployer, setShowEmployer] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const cfg = simulator.inputs[mode];
  const gross = useMemo(() => (mode === "gross" ? value : netToGross(value)), [mode, value]);
  const r = useMemo(() => grossToNet(gross), [gross]);
  const total = showEmployer ? r.employerCost : r.gross;
  const share = (n) => (total > 0 ? n / total : 0);
  const employerPart = r.cnasEmployer + r.fnpos;
  const burden = r.gross > 0 ? (r.cnasEmployee + r.irg) / r.gross : 0;

  const fGross = useFraction(share(r.gross), reduce);
  const fCnas = useFraction(share(r.net + r.cnasEmployee), reduce);
  const fNet = useFraction(share(r.net), reduce);

  const announce = useDebouncedValue(
    `Brut ${money(r.gross, { decimals: 0 })}, net ${money(r.net, { decimals: 0 })}, ${simulator.announce.cost} ${money(r.employerCost, { decimals: 0 })}.`,
    700,
  );

  const sliderValue = clamp(value, cfg.min, cfg.max);
  const sliderFraction = (sliderValue - cfg.min) / (cfg.max - cfg.min);

  function changeMode(next) {
    if (next === mode) return;
    setValue(Math.round(next === "net" ? r.net : gross));
    setMode(next);
    setEditing(false);
  }
  function onType(text) {
    const digits = text.replace(/\D/g, "").slice(0, String(MAX_INPUT).length);
    setDraft(digits);
    setValue(Number(digits || 0));
  }
  function applyPreset(presetGross) {
    setValue(mode === "gross" ? presetGross : Math.round(grossToNet(presetGross).net));
  }

  const legend = [
    { key: "net", label: simulator.segments.net, amount: r.net, swatch: "bg-primary" },
    { key: "cnas", label: simulator.segments.cnas, amount: r.cnasEmployee, swatch: "bg-pine-300" },
    { key: "irg", label: simulator.segments.irg, amount: r.irg, swatch: "bg-chart-8" },
    ...(showEmployer ? [{ key: "employer", label: "Charges patronales", amount: employerPart, swatch: "bg-neutral" }] : []),
  ];

  return (
    <div className={cn("grid items-start gap-[1.5em] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[2em]", className)}>
      {/* ---------- controls ---------- */}
      <Reveal className="flex flex-col gap-[1.5em] rounded-xl border border-border bg-surface p-[1.5em] shadow-sm md:p-[2em]">
        <Segmented value={mode} onChange={changeMode} options={simulator.modes} className="self-start" />

        <div className="flex flex-col gap-[0.75em]">
          <TextInput
            label={cfg.label}
            hint={cfg.hint}
            suffix="DA"
            inputMode="numeric"
            autoComplete="off"
            value={editing ? draft : int(value)}
            onFocus={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            onBlur={() => setEditing(false)}
            onChange={onType}
          />

          <div className="relative flex h-[2.75em] items-center">
            <div aria-hidden className="pointer-events-none absolute inset-x-[0.875em] h-[0.375em] overflow-hidden rounded-full bg-border">
              <div className="h-full w-full bg-primary" style={{ transform: `scaleX(${sliderFraction})`, transformOrigin: "left" }} />
            </div>
            <input
              id={sliderId}
              type="range"
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
              value={sliderValue}
              onChange={(e) => {
                setEditing(false);
                setValue(Number(e.target.value));
              }}
              aria-label={cfg.label}
              aria-valuetext={money(sliderValue, { decimals: 0 })}
              className={cn(
                "relative h-full w-full cursor-pointer appearance-none bg-transparent",
                "[&::-webkit-slider-thumb]:size-[1.75em] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-md",
                "[&::-moz-range-thumb]:size-[1.75em] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-md",
                "[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent",
              )}
            />
          </div>
          <div className="flex justify-between font-mono text-[0.75em] text-fg-muted" aria-hidden>
            <span>{int(cfg.min)}</span>
            <span>{int(cfg.max)}</span>
          </div>

          {mode === "gross" && gross < defaultParams.snmg && (
            <Badge tone="warning" icon={AlertTriangle} className="h-auto self-start whitespace-normal py-[0.35em] text-start">
              {simulator.belowSnmg}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-[0.5em]" role="group" aria-label="Exemples de salaires">
          {simulator.presets.map((p) => (
            <Button key={p.label} size="sm" variant={mode === "gross" && value === p.gross ? "soft" : "secondary"} onClick={() => applyPreset(p.gross)}>
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-[1em] border-t border-border pt-[1.25em]">
          <span id={`${sliderId}-employer`} className="text-sm text-fg-secondary">Afficher le coût employeur</span>
          <Toggle checked={showEmployer} onChange={setShowEmployer} label="Afficher le coût employeur" />
        </div>

        <p className="flex gap-[0.6em] text-[0.8125em] text-fg-muted text-pretty">
          <Info aria-hidden className="mt-[0.15em] size-[1.1em] shrink-0" strokeWidth={1.75} />
          <span>
            {simulator.disclaimer} <span className="font-mono">{simulator.rulesNote}</span>
          </span>
        </p>
      </Reveal>

      {/* ---------- result (payslip-like ledger) ---------- */}
      <Reveal delay={0.08} className="overflow-hidden rounded-xl border border-border bg-surface shadow-paper">
        <div className="border-b border-border bg-surface-2 px-[1.5em] py-[0.75em] font-mono text-[0.75em] uppercase tracking-[0.08em] text-fg-muted md:px-[2em]">
          Simulation · {periodLabel("2026-10")}
        </div>

        <div className="flex flex-col gap-[1.75em] p-[1.5em] md:p-[2em]">
          <div>
            <p className="text-sm text-fg-secondary">{mode === "gross" ? simulator.rows.net : simulator.rows.requiredGross}</p>
            <Flow value={mode === "gross" ? r.net : gross} className="font-display text-[2.75em] font-semibold leading-[1.1] tracking-[-0.03em] text-fg md:text-[3.25em]" />
            <p className="mt-[0.25em] text-sm text-fg-muted">
              {mode === "gross" ? (
                <>
                  {simulator.rows.burden} : <Flow value={burden} percent className="font-medium text-fg-secondary" />
                </>
              ) : (
                <>
                  Pour un net de <Flow value={value} className="font-medium text-fg-secondary" />
                </>
              )}
            </p>
          </div>

          {/* stacked bar: net / CNAS / IRG (+ employer) */}
          <div>
            <div
              role="img"
              aria-label={`Répartition : net ${money(r.net, { decimals: 0 })}, CNAS ${money(r.cnasEmployee, { decimals: 0 })}, IRG ${money(r.irg, { decimals: 0 })}`}
              className="relative h-[1.5em] overflow-hidden rounded-full bg-bg-sunken"
            >
              <div className="absolute inset-0 bg-neutral" />
              <motion.div style={{ scaleX: fGross, transformOrigin: "left" }} className="absolute inset-0 bg-chart-8" />
              <motion.div style={{ scaleX: fCnas, transformOrigin: "left" }} className="absolute inset-0 bg-pine-300" />
              <motion.div style={{ scaleX: fNet, transformOrigin: "left" }} className="absolute inset-0 bg-primary" />
            </div>
            <ul className={cn("mt-[0.9em] grid gap-[0.75em]", showEmployer ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3")}>
              {legend.map((s) => (
                <li key={s.key} className="min-w-0">
                  <p className="flex items-center gap-[0.45em] text-[0.8125em] text-fg-secondary">
                    <span aria-hidden className={cn("size-[0.7em] shrink-0 rounded-xs", s.swatch)} />
                    <span className="truncate">{s.label}</span>
                  </p>
                  <p className="text-[0.8125em] font-medium text-fg">
                    <Flow value={share(s.amount)} percent />
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <dl className="border-t border-border pt-[0.75em]">
            <Line label={simulator.rows.gross}><Flow value={r.gross} /></Line>
            <Line label={`${simulator.rows.cnas} (${int(defaultParams.cnasEmployee * 100)} %)`} sign="−"><Flow value={r.cnasEmployee} /></Line>
            <Line label={simulator.rows.taxable} muted><Flow value={r.taxable} /></Line>
            <Line label={simulator.rows.irg} sign="−"><Flow value={r.irg} /></Line>
            <div className="mt-[0.5em] border-b-[4px] border-double border-border-strong pt-[0.5em]" />
            <Line label={simulator.rows.net} strong><Flow value={r.net} /></Line>
          </dl>

          <dl className="rounded-lg bg-primary-soft/60 p-[1em] text-sm">
            <dt className="mb-[0.4em] text-[0.75em] font-semibold uppercase tracking-[0.08em] text-fg-muted">{simulator.rows.employerTitle}</dt>
            <Line label={`${simulator.rows.cnasEmployer} (${int(defaultParams.cnasEmployer * 100)} %)`} sign="+"><Flow value={r.cnasEmployer} /></Line>
            <Line label={simulator.rows.fnpos} sign="+"><Flow value={r.fnpos} /></Line>
            <Line label={simulator.rows.employerCost} strong><Flow value={r.employerCost} /></Line>
          </dl>

          <Button href={simulator.cta.href} variant="secondary" className="self-start">
            {simulator.cta.label}
          </Button>
        </div>
      </Reveal>

      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  );
}
