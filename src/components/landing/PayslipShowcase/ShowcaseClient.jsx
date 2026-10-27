"use client";

// Pine-900 band: the big payslip, rotated by scroll and by the pointer, with hairline leaders pointing at the
// CNAS, IRG, Net and employer-contribution rows. The active row steps with scroll and follows hover / focus.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import PayslipPaper from "@/components/shared/Payslip3DPaper";
import Zellige from "@/components/shared/Zellige";
import { SAMPLE_PAYSLIP } from "@/components/shared/payslip-sample";
import CountUp from "@/components/motion/CountUp";
import { lpDur, lpEase, lpTilt, lpViewport } from "@/components/motion/landing-tokens";
import { useTilt } from "@/components/motion/useTilt";

const slip = SAMPLE_PAYSLIP;
const AMOUNT = {
  cnas: { to: slip.cnasEmployee, prefix: "−" },
  irg: { to: slip.irg, prefix: "−" },
  net: { to: slip.net, prefix: "" },
  patronal: { to: slip.cnasEmployer, prefix: "" },
};

/** y position (% of paper height) of each annotated row, measured from the DOM and refreshed on resize. */
function useRowPositions(paperRef, keys) {
  const [ys, setYs] = useState({});
  useEffect(() => {
    const root = paperRef.current;
    if (!root) return;
    const measure = () => {
      const h = root.offsetHeight;
      if (!h) return;
      const next = {};
      keys.forEach((k) => {
        const el = root.querySelector(`[data-slip-row="${k}"]`);
        if (el) next[k] = ((el.offsetTop + el.offsetHeight / 2) / h) * 100;
      });
      setYs(next);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const id = requestAnimationFrame(measure);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [paperRef, keys]);
  return ys;
}

function Leader({ a, index, y, active }) {
  const left = a.side === "left";
  const amount = AMOUNT[a.key];
  const dy = a.dy ?? 0;
  return (
    <div
      style={{ top: `${y}%` }}
      className={cn("pointer-events-none absolute z-10 hidden -translate-y-1/2 items-center [transform-style:preserve-3d] lg:flex", left ? "end-full" : "start-full flex-row-reverse")}
    >
      <div
        data-active={active}
        style={{ translate: `0 ${dy}em` }}
        className={cn(
          "w-[8.4em] rounded-md border px-[0.7em] py-[0.45em] text-xs transition-[background-color,border-color] duration-200 [transform:translateZ(2.5em)]",
          left ? "text-end" : "text-start",
          active ? "border-pine-300 bg-pine-700" : "border-pine-700 bg-pine-800/90",
        )}
      >
        <p className="font-semibold text-pine-50">
          <span className="me-[0.4em] font-mono text-pine-300">{index + 1}</span>
          {a.label}
        </p>
        <p className="num font-mono text-pine-200">
          {amount.prefix}
          {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(amount.to)}
        </p>
      </div>
      <span className="relative h-px w-[1.4em]">
        <motion.span
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={lpViewport}
          transition={{ duration: lpDur.draw, ease: lpEase.inOut, delay: 0.5 + index * 0.15 }}
          className={cn("absolute inset-0 bg-pine-300/70 transition-colors duration-200", left ? "origin-right" : "origin-left", active && "bg-pine-200")}
        />
        {dy !== 0 && (
          <span
            aria-hidden
            style={{ height: `${Math.abs(dy)}em` }}
            className={cn("absolute w-px bg-pine-300/70", left ? "start-0" : "end-0", dy < 0 ? "bottom-0" : "top-0")}
          />
        )}
      </span>
      <span aria-hidden className={cn("size-[0.55em] rounded-full border border-pine-300 bg-pine-900 transition-colors duration-200", active && "bg-pine-300", left ? "-me-[0.3em]" : "-ms-[0.3em]")} />
    </div>
  );
}

export default function ShowcaseClient({ content }) {
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const paperRef = useRef(null);
  const inView = useInView(stageRef, { once: true, amount: 0.4 });
  const keys = content.annotations.map((a) => a.key);
  const ys = useRowPositions(paperRef, keys);

  const [scrollIdx, setScrollIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(null);
  const active = hoverIdx ?? scrollIdx;

  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start 0.85", "end 0.35"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(keys.length - 1, Math.max(0, Math.floor(v * keys.length)));
    setScrollIdx((cur) => (cur === i ? cur : i));
  });

  const tilt = useTilt({ max: lpTilt.showcase });
  const scrollY = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [-8, -8, -8] : [-16, -4, 8]);
  const scrollX = useTransform(scrollYProgress, [0, 1], reduce ? [3, 3] : [9, -2]);
  const rotateY = useTransform([scrollY, tilt.rotateY], ([a, b]) => a + b);
  const rotateX = useTransform([scrollX, tilt.rotateX], ([a, b]) => a + b);

  return (
    <section id={content.id} aria-labelledby="showcase-title" className="relative isolate scroll-mt-[2em] overflow-hidden bg-pine-900 py-[6em] text-pine-50 md:py-[8em]">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(55%_70%_at_72%_45%,color-mix(in_srgb,var(--pine-700)_38%,transparent),transparent_72%),radial-gradient(120%_90%_at_50%_120%,var(--pine-950),transparent_60%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 text-pine-200 opacity-[0.06] [mask-image:radial-gradient(50%_60%_at_70%_45%,black,transparent_75%)]">
        <Zellige id="zellige-showcase" />
      </div>

      <Container size="wide" className="grid items-center gap-[4em] lg:grid-cols-[0.8fr_1.2fr] lg:gap-[2em]">
        <div className="flex flex-col gap-[2em]">
          <SectionHeader id="showcase-title" tone="dark" eyebrow={content.eyebrow} title={content.title} description={content.description} />

          <ol className="flex flex-col gap-[0.4em]" onPointerLeave={() => setHoverIdx(null)}>
            {content.annotations.map((a, i) => {
              const isActive = active === i;
              const amount = AMOUNT[a.key];
              return (
                <li
                  key={a.key}
                  tabIndex={0}
                  data-active={isActive}
                  onPointerEnter={() => setHoverIdx(i)}
                  onFocus={() => setHoverIdx(i)}
                  onBlur={() => setHoverIdx(null)}
                  className={cn(
                    "grid grid-cols-[1.9em_1fr_auto] items-baseline gap-x-[0.8em] rounded-md border-s-2 py-[0.75em] ps-[0.9em] pe-[0.6em] transition-[background-color,border-color] duration-200 focus-visible:outline-none",
                    isActive ? "border-pine-300 bg-pine-800/70" : "border-pine-700 bg-transparent",
                  )}
                >
                  <span className="flex size-[1.7em] items-center justify-center self-start rounded-full bg-pine-700 text-xs font-semibold text-pine-50">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-pine-50">{a.label}</p>
                    <p className="mt-[0.15em] max-w-[44ch] text-sm text-pine-200">{a.text}</p>
                  </div>
                  <CountUp to={amount.to} decimals={2} prefix={amount.prefix} suffix=" DA" className="font-mono text-sm text-pine-300" />
                </li>
              );
            })}
          </ol>

          <div className="flex flex-col items-start gap-[0.8em]">
            <Link
              href={content.link.href}
              className="group inline-flex items-center gap-[0.5em] font-medium text-pine-300 transition-colors duration-150 hover:text-pine-100"
            >
              <span className="relative">
                {content.link.label}
                <span aria-hidden className="absolute inset-x-0 -bottom-[0.15em] h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100" />
              </span>
              <ArrowRight className="size-[1.1em] transition-transform duration-200 group-hover:translate-x-[0.2em]" aria-hidden strokeWidth={1.75} />
            </Link>
            <p className="max-w-[52ch] text-xs text-pine-300/80">{content.note}</p>
          </div>
        </div>

        <div ref={stageRef} className="mx-auto w-full max-w-[34em] pe-[2.4em] lg:max-w-none lg:pe-0" {...tilt.handlers}>
          <div role="img" aria-label={content.paperLabel} className="mx-auto w-full max-w-[23em] [perspective:100em] lg:w-[23em] lg:text-[1.12em]">
            <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="relative">
              <div className="relative [transform-style:preserve-3d] lg:[&_[data-marker]]:hidden">
                <PayslipPaper ref={paperRef} slip={slip} activeKey={keys[active]} markers={{ cnas: 1, irg: 2, net: 3, patronal: 4 }} stamp={inView} />
                {content.annotations.map((a, i) => (ys[a.key] != null ? <Leader key={a.key} a={a} index={i} y={ys[a.key]} active={active === i} /> : null))}
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
