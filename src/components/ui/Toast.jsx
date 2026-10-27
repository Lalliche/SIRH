"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion-tokens";

let toasts = [];
const listeners = new Set();
let n = 0;
const emit = () => listeners.forEach((l) => l());

function push(kind, message, opts = {}) {
  const id = ++n;
  toasts = [...toasts, { id, kind, message, ...opts }];
  emit();
  if (kind !== "error") setTimeout(() => dismiss(id), opts.duration ?? 5000);
  return id;
}
export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
export const toast = {
  success: (m, o) => push("success", m, o),
  error: (m, o) => push("error", m, o),
  info: (m, o) => push("info", m, o),
  warning: (m, o) => push("warning", m, o),
};

const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const bars = { success: "bg-success", error: "bg-danger", info: "bg-info", warning: "bg-warning" };
const sub = (l) => { listeners.add(l); return () => listeners.delete(l); };
const empty = [];

export function Toaster() {
  const items = useSyncExternalStore(sub, () => toasts, () => empty);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-[1em] start-[1em] z-[90] flex flex-col gap-[0.5em] text-[14px]">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = icons[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16 }}
              transition={spring.snappy}
              className="pointer-events-auto relative flex w-[22em] max-w-[calc(100vw-2em)] items-start gap-[0.7em] overflow-hidden rounded-lg border border-border bg-surface py-[0.8em] pe-[1em] ps-[1.2em] shadow-lg"
            >
              <span className={cn("absolute inset-y-0 start-0 w-[3px]", bars[t.kind])} />
              <Icon className="mt-[0.1em] size-[1.2em] shrink-0 text-fg-secondary" aria-hidden />
              <p className="flex-1 text-fg">{t.message}</p>
              {t.action && (
                <button type="button" onClick={() => { t.action.onClick(); dismiss(t.id); }} className="font-medium text-link hover:underline">
                  {t.action.label}
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
