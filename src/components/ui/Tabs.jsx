"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion-tokens";

export default function Tabs({ tabs, value, onChange, className }) {
  const group = useId();
  return (
    <div role="tablist" className={cn("flex gap-[1.5em] overflow-x-auto border-b border-border", className)}>
      {tabs.map((t) => {
        const tab = typeof t === "string" ? { value: t, label: t } : t;
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative flex h-[2.75em] shrink-0 items-center gap-[0.5em] text-[0.875em] font-medium transition-colors duration-150",
              active ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {tab.icon && <tab.icon className="size-[1.1em]" aria-hidden strokeWidth={1.75} />}
            {tab.label}
            {tab.count != null && <span className="rounded-full bg-neutral-bg px-[0.55em] text-[0.8em] text-neutral-fg">{tab.count}</span>}
            {active && <motion.span layoutId={`tab-${group}`} transition={spring.snappy} className="absolute inset-x-0 -bottom-px h-[2px] bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
