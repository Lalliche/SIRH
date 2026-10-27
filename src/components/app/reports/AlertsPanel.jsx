"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion-tokens";


/** items: [{ id, label, tone, people: [{ id, name, note? }], href }] */
export default function AlertsPanel({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {items.map((it) => {
        const n = it.people.length;
        const isOpen = open === it.id;
        return (
          <li key={it.id}>
            <button
              type="button"
              disabled={n === 0}
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : it.id)}
              className="flex w-full items-center gap-[0.7em] py-[0.7em] text-start disabled:cursor-default"
            >
              {n === 0 ? <Check className="size-[1.1em] shrink-0 text-success-fg" aria-hidden /> : <Badge tone={it.tone} dot={false} className="min-w-[2.2em] justify-center num">{n}</Badge>}
              <span className={cn("flex-1 text-sm", n === 0 ? "text-fg-muted" : "text-fg")}>{it.label}{n === 0 && <span className="sr-only"> : aucun</span>}</span>
              {n > 0 && <ChevronDown className={cn("size-[1.1em] text-fg-muted transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: duration.base, ease: ease.out }} className="overflow-hidden">
                  {it.people.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-[0.6em] ps-[2.9em] pb-[0.5em] text-sm">
                      <Link href={`/app/employees/${p.id}`} className="text-fg-secondary hover:text-fg hover:underline">{p.name}</Link>
                      {p.note && <span className="text-xs text-fg-muted num">{p.note}</span>}
                    </li>
                  ))}
                  {n > 6 && <li className="ps-[2.9em] pb-[0.5em] text-xs text-fg-muted">+ {n - 6} autres · <Link href={it.href} className="underline">Voir dans Employés</Link></li>}
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

