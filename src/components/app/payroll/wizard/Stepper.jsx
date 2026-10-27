"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";
import { duration, ease } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "../drafts";

/** Animated 6-step stepper. `reachable(n)` says whether a step can be opened by clicking. */
export default function Stepper({ step, reachable, onSelect }) {
  const progress = (step - 1) / (WIZARD_STEPS.length - 1);
  return (
    <nav aria-label="Étapes de la paie" className="relative">
      <div aria-hidden className="absolute inset-x-[1.6em] top-[1.1em] hidden h-[2px] bg-border sm:block">
        <motion.div
          className="h-full origin-left bg-primary"
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ duration: duration.panel, ease: ease.out }}
        />
      </div>
      <ol className="relative flex justify-between gap-[0.25em]">
        {WIZARD_STEPS.map((s) => {
          const done = s.n < step;
          const current = s.n === step;
          return (
            <li key={s.key} className="flex flex-1 flex-col items-center">
              <Button
                variant="ghost"
                size="icon"
                disabled={!reachable(s.n)}
                onClick={() => onSelect(s.n)}
                aria-current={current ? "step" : undefined}
                aria-label={`Étape ${s.n} : ${s.long}${done ? " (terminée)" : ""}`}
                className={cn(
                  "!size-[2.3em] rounded-full border-2 bg-surface !text-[0.875em] font-semibold",
                  current ? "border-primary text-link ring-4 ring-primary-soft" : done ? "border-primary bg-primary !text-primary-fg" : "border-border-strong text-fg-muted",
                )}
              >
                {done ? <Check className="size-[1.2em]" aria-hidden /> : s.n}
              </Button>
              <span className={cn("mt-[0.45em] text-center text-xs leading-tight", current ? "font-semibold text-fg" : "text-fg-muted", !current && "max-sm:hidden")}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
