"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { amount } from "@/lib/format";
import { depth } from "@/lib/motion-tokens";
import Stamp from "@/components/ui/Stamp";
import { lpDur, lpEase, lpFollow, lpTilt } from "@/components/motion/landing-tokens";
import { useCanHover } from "@/components/motion/use-media";
import { useTilt } from "@/components/motion/useTilt";
import PayslipPaper from "./Payslip3DPaper";
import { SAMPLE_PAYSLIP } from "./payslip-sample";

export { PayslipPaper };

const REST = { x: 4, y: -11 }; // resting pose of the stage (degrees): the object is always a little 3D

/**
 * Motion for the exploded payslip, shared by the hero (with the dashboard in the same stage) and any standalone use.
 *  - `spread` 0..1: how far the layers are separated in Z. Intro spring 0 -> 1, then (hero) folds back as the target scrolls away.
 *  - `phase` 0..2: discrete moments for React (net starts rolling, cachet lands).
 * Pointer tilt on hover devices; CSS sway on touch; reduced motion = final pose, nothing moves.
 */
export function usePayslipMotion(targetRef, { tiltMax = lpTilt.hero, scrollLinked = true, delay = 0.5 } = {}) {
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const intro = useMotionValue(0);
  const [phase, setPhase] = useState(0);

  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start start", "end start"] });
  const fold = useTransform(scrollYProgress, [0, 0.8], [1, 0.25]);
  const spread = useTransform([intro, fold], ([a, b]) => (reduce || !scrollLinked ? a : a * b));

  const tilt = useTilt({ max: tiltMax });
  const rotateX = useTransform(tilt.rotateX, (v) => v + REST.x);
  const rotateY = useTransform(tilt.rotateY, (v) => v + REST.y);

  useMotionValueEvent(intro, "change", (v) => setPhase((p) => Math.max(p, v > 0.9 ? 2 : v > 0.45 ? 1 : 0)));

  useEffect(() => {
    if (reduce) {
      intro.set(1);
      return;
    }
    const c = animate(intro, 1, { type: "spring", ...lpFollow.layers, delay });
    return () => c.stop();
  }, [reduce, intro, delay]);

  // Touch: tap the object to replay the separation.
  const replay = () => {
    if (reduce) return;
    intro.set(0.15);
    animate(intro, 1, { type: "spring", ...lpFollow.layers });
  };

  return { spread, phase, canHover, reduce, stage: { rotateX, rotateY }, handlers: tilt.handlers, replay };
}

/** One floating layer: Z, a slide-out from the plate and a fade all follow `spread`. */
function Layer({ spread, z, from = [0, 0], className, children }) {
  const zz = useTransform(spread, (v) => v * z);
  const x = useTransform(spread, (v) => `${(1 - v) * from[0]}em`);
  const y = useTransform(spread, (v) => `${(1 - v) * from[1]}em`);
  const opacity = useTransform(spread, [0, 0.35, 0.8], [0, 0.4, 1]);
  return (
    <motion.div style={{ z: zz, x, y, opacity }} className={cn("absolute", className)}>
      {children}
    </motion.div>
  );
}

function IdChip({ employee }) {
  return (
    <div className="flex w-[11.4em] items-center gap-[0.7em] rounded-lg border border-border bg-surface p-[0.7em] text-fg shadow-lg">
      <span aria-hidden className="flex size-[2.6em] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.9em] font-semibold text-link">
        {employee.initials}
      </span>
      <span className="min-w-0 text-[0.78em] leading-tight">
        <span className="block truncate font-semibold">{employee.name}</span>
        <span className="block truncate font-mono text-fg-muted">{employee.matricule}</span>
        <span className="block truncate text-fg-muted">{employee.job}</span>
      </span>
    </div>
  );
}

function CalcCard({ slip, phase }) {
  const parts = [
    { key: "net", w: (slip.net / slip.gross) * 100, cls: "bg-pine-700" },
    { key: "cnas", w: (slip.cnasEmployee / slip.gross) * 100, cls: "bg-pine-400" },
    { key: "irg", w: (slip.irg / slip.gross) * 100, cls: "bg-pine-200" },
  ];
  return (
    <div className="w-[12em] whitespace-nowrap rounded-lg border border-border bg-surface p-[0.8em] text-[0.78em] text-fg shadow-lg">
      <p className="mb-[0.5em] text-[0.8em] font-semibold uppercase tracking-[0.1em] text-fg-muted">Du brut au net</p>
      <dl className="space-y-[0.25em]">
        <div className="flex justify-between gap-[1em]">
          <dt>Brut</dt>
          <dd className="num font-medium">{amount(slip.gross)}</dd>
        </div>
        <div className="flex justify-between gap-[1em] text-fg-secondary">
          <dt>CNAS {slip.cnasRate}</dt>
          <dd className="num">−{amount(slip.cnasEmployee)}</dd>
        </div>
        <div className="flex justify-between gap-[1em] text-fg-secondary">
          <dt>IRG</dt>
          <dd className="num">−{amount(slip.irg)}</dd>
        </div>
      </dl>
      <div aria-hidden className="mt-[0.7em] flex h-[0.45em] overflow-hidden rounded-pill bg-bg-sunken">
        {parts.map((p, i) => (
          <motion.span
            key={p.key}
            className={cn("h-full origin-left", p.cls)}
            style={{ width: `${p.w}%` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: phase >= 1 ? 1 : 0 }}
            transition={{ duration: lpDur.bar, ease: lpEase.emphasized, delay: i * 0.08 }}
          />
        ))}
      </div>
    </div>
  );
}

function NetChip({ slip, phase }) {
  return (
    <div className="rounded-lg bg-pine-700 px-[1em] py-[0.75em] text-pine-50 shadow-lg">
      <p className="flex items-center gap-[0.5em] text-[0.72em] font-medium text-pine-200">
        <span aria-hidden className="size-[0.55em] rounded-full bg-clay-600" />
        Net à payer · {slip.period}
      </p>
      <p className="font-display text-[1.35em] font-bold leading-[1.1] tracking-[-0.02em]">
        <NumberFlow
          value={phase >= 1 ? slip.net : 0}
          locales="fr-FR"
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          suffix=" DA"
          transformTiming={{ duration: lpDur.count * 1000, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          willChange
        />
      </p>
    </div>
  );
}

/** The five layers (plate, calc card, ID chip, net chip, cachet). Size it by giving the parent a width in em. */
export function PayslipLayers({ spread, phase, slip = SAMPLE_PAYSLIP, className }) {
  return (
    <div className={cn("relative [transform-style:preserve-3d]", className)}>
      <motion.div
        initial={{ opacity: 0, y: "6%", rotateX: 16 }}
        animate={{ opacity: 1, y: "0%", rotateX: 0 }}
        transition={{ duration: lpDur.hero, ease: lpEase.emphasized }}
        className="[transform-origin:50%_100%]"
      >
        <PayslipPaper slip={slip} />
      </motion.div>

      <Layer spread={spread} z={depth.rows} from={[7, -2]} className="-start-[9.5em] bottom-[3.4em] max-md:hidden">
        <CalcCard slip={slip} phase={phase} />
      </Layer>
      <Layer spread={spread} z={depth.chip} from={[7, 2]} className="-start-[10.2em] top-[3.4em]">
        <IdChip employee={slip.employee} />
      </Layer>
      <Layer spread={spread} z={depth.seal} from={[-4, -3]} className="-end-[3.2em] top-[61%]">
        <NetChip slip={slip} phase={phase} />
      </Layer>
      <Layer spread={spread} z={depth.chip} from={[0, 0]} className="bottom-[0.6em] end-[1.4em]">
        {phase >= 2 && <Stamp label="PAYÉ" sub="OCT. 2026" className="size-[4.6em] text-[0.9em]" />}
      </Layer>
    </div>
  );
}

/**
 * Standalone exploded payslip (own intro, tilt, scroll fold). Give it a width via className / the parent's
 * font-size (the paper is 100 % of its box). The hero composes `usePayslipMotion` + `PayslipLayers` itself.
 */
export default function Payslip3D({ slip = SAMPLE_PAYSLIP, className, scrollLinked = false }) {
  const ref = useRef(null);
  const { spread, phase, canHover, stage, handlers, replay } = usePayslipMotion(ref, { scrollLinked });
  return (
    <div ref={ref} className={cn("relative", className)} style={{ perspective: "90em" }} {...handlers} onClick={canHover ? undefined : replay}>
      <div className={cn("[transform-style:preserve-3d]", !canHover && "sirh-sway")}>
        <motion.div style={{ ...stage, transformStyle: "preserve-3d" }}>
          <PayslipLayers spread={spread} phase={phase} slip={slip} />
        </motion.div>
      </div>
    </div>
  );
}
