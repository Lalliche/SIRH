"use client";

import { motion } from "motion/react";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion-tokens";

const TABS = [
  { key: "paie", label: "Paie" },
  { key: "conges", label: "Congés" },
  { key: "pointage", label: "Pointage" },
];

/** Content header: the live tab set (shared-element indicator) plus inert toolbar affordances. */
export default function PreviewTabs({ tab, onSelect, subtitle }) {
  return (
    <div className="flex items-center justify-between gap-[1em] border-b border-border-subtle px-[0.9em]">
      <div role="tablist" className="flex gap-[1.1em]">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onSelect(t.key)}
              className={cn(
                "relative flex h-[2.5em] items-center text-[0.78em] font-medium transition-colors duration-150",
                active ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {t.label}
              {active && <motion.span layoutId="hero-preview-tab" transition={spring.snappy} className="absolute inset-x-0 -bottom-px h-[2px] bg-primary" />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-[0.4em]">
        {subtitle && <span className="hidden font-mono text-[0.64em] text-fg-muted md:inline">{subtitle}</span>}
        <span aria-hidden className="flex size-[1.6em] items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted">
          <Search className="size-[0.9em]" strokeWidth={1.75} />
        </span>
        <span aria-hidden className="flex size-[1.6em] items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted">
          <SlidersHorizontal className="size-[0.9em]" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
