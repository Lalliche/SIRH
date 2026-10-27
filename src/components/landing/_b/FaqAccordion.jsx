"use client";

import { useId, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, spring } from "@/lib/motion-tokens";

/**
 * Accessible single-open accordion. Height change is a motion `layout` animation (FLIP), never a height keyframe.
 * items: [{ q, a }]. Ledger look: hairline rows, no card chrome so scaled layout boxes never distort.
 */
export default function FaqAccordion({ items, defaultOpen = 0, className }) {
  const base = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <LayoutGroup id={base}>
      <ul className={cn("flex flex-col border-t border-border", className)}>
        {items.map((item, i) => {
          const isOpen = open === i;
          const buttonId = `${base}-q${i}`;
          const panelId = `${base}-a${i}`;
          return (
            <motion.li key={item.q} layout="position" transition={spring.soft} className="relative border-b border-border">
              <motion.span
                aria-hidden
                initial={false}
                animate={{ scaleY: isOpen ? 1 : 0 }}
                transition={{ duration: duration.panel, ease: ease.out }}
                style={{ transformOrigin: "top" }}
                className="absolute inset-y-0 start-0 w-[2px] bg-primary"
              />
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="group flex w-full items-center justify-between gap-[1.25em] py-[1.25em] ps-[1em] pe-[0.25em] text-start text-[1.0625em] font-medium text-fg transition-colors duration-150 hover:text-link"
                >
                  <span className="text-pretty">{item.q}</span>
                  <motion.span aria-hidden initial={false} animate={{ rotate: isOpen ? 180 : 0 }} transition={spring.snappy} className="shrink-0 text-fg-muted group-hover:text-link">
                    <ChevronDown className="size-[1.25em]" strokeWidth={1.75} />
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: duration.panel, ease: ease.out, delay: duration.fast } }}
                    exit={{ opacity: 0, transition: { duration: duration.fast } }}
                  >
                    <p className="max-w-[62ch] pb-[1.5em] ps-[1em] pe-[2.5em] text-fg-secondary text-pretty">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}
