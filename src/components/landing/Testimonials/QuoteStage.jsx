"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button, Tabs } from "@/components/ui";
import { ARCH } from "../_b/arch";
import { testimonials } from "@/content/testimonials";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion-tokens";

const items = testimonials.items;

// [PLACEHOLDER] all content is fictional, see src/content/testimonials.js
export default function QuoteStage() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const playing = !paused && !hover && inView && !reduce;
  const item = items[index];

  const go = (next) => setIndex((i) => (i + next + items.length) % items.length);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % items.length), testimonials.autoplayMs);
    return () => clearTimeout(t);
  }, [playing, index]);

  const [first, ...rest] = item.name.split(" ");

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="flex flex-col gap-[2em]"
    >
      <Tabs
        tabs={items.map((t) => ({ value: t.id, label: t.name }))}
        value={item.id}
        onChange={(id) => setIndex(items.findIndex((t) => t.id === id))}
        className="max-w-[40em]"
      />

      <motion.div
        role="tabpanel"
        aria-live={playing ? "off" : "polite"}
        drag={reduce ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) go(1);
          else if (info.offset.x > 80) go(-1);
        }}
        className="touch-pan-y"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={item.id}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: duration.panel, ease: ease.out }}
            className="grid gap-[2em] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-[4em]"
          >
            <div className="flex flex-col gap-[1.75em]">
              <span aria-hidden className="font-display text-[4em] font-semibold leading-[0.5] text-pine-300">“</span>
              <blockquote className="max-w-[36em] font-display text-[1.375em] font-medium leading-[1.4] tracking-[-0.015em] text-fg text-pretty md:text-[1.75em]">
                {item.quote}
              </blockquote>
              <figcaption className="flex items-center gap-[1em]">
                <span aria-hidden className={cn("grid h-[3.75em] w-[3em] shrink-0 place-items-center bg-primary-soft font-display text-[1.125em] font-semibold text-link", ARCH)}>
                  {initials(first, rest.join(" "))}
                </span>
                <span>
                  <span className="block font-semibold text-fg">{item.name}</span>
                  <span className="block text-sm text-fg-secondary">{item.role}</span>
                  <span className="block text-sm text-fg-muted">{item.company} · {item.city}</span>
                </span>
              </figcaption>
            </div>
            <div className="rounded-lg border border-border bg-surface px-[1.5em] py-[1.25em] shadow-sm lg:min-w-[15em]">
              <p className="font-display text-[1.5em] font-semibold tracking-[-0.02em] text-fg">{item.metric.value}</p>
              <p className="text-sm text-fg-muted">{item.metric.label}</p>
            </div>
          </motion.figure>
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center gap-[1em]">
        <div aria-hidden className="relative h-[2px] flex-1 overflow-hidden bg-border">
          {playing ? (
            <motion.span
              key={index}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: testimonials.autoplayMs / 1000, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className="absolute inset-0 bg-primary"
            />
          ) : (
            <span className="absolute inset-0 origin-left scale-x-0 bg-primary" />
          )}
        </div>
        <div className="flex items-center gap-[0.25em]">
          <Button size="icon" variant="ghost" icon={ChevronLeft} aria-label="Témoignage précédent" onClick={() => go(-1)} />
          <Button size="icon" variant="ghost" icon={ChevronRight} aria-label="Témoignage suivant" onClick={() => go(1)} />
          {!reduce && (
            <Button size="icon" variant="ghost" icon={paused ? Play : Pause} aria-label={paused ? testimonials.play : testimonials.pause} onClick={() => setPaused((v) => !v)} />
          )}
        </div>
      </div>
    </div>
  );
}
