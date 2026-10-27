"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import { Avatar, Button, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";
import { dateShort } from "@/lib/format";
import { duration, ease } from "@/lib/motion-tokens";

function Row({ item, canManage, onEnrollMissing, onPlan }) {
  const [open, setOpen] = useState(false);
  const ok = item.missing.length === 0;
  const pct = Math.round(((item.trained + item.enrolled) / Math.max(1, item.total)) * 100);
  const seatsLeft = item.next ? item.next.seats - item.next.participantIds.length : 0;
  const Icon = ok ? ShieldCheck : ShieldAlert;
  return (
    <li className="py-[0.9em] first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-[1em] gap-y-[0.6em]">
        <Icon className={cn("size-[1.3em] shrink-0", ok ? "text-success-fg" : "text-warning-fg")} aria-hidden />
        <div className="min-w-[14em] flex-1">
          <p className="font-medium text-fg">{item.title}</p>
          <p className="text-xs text-fg-muted">Obligatoire · {item.scopeLabel}</p>
        </div>
        <div className="w-[12em] max-w-full">
          <Progress value={item.trained} max={Math.max(1, item.total)} tone={ok ? "success" : "warning"} />
          <p className="mt-[0.3em] text-xs text-fg-muted num">
            {item.trained} formés · {item.enrolled} inscrits · <span className={cn(!ok && "font-medium text-warning-fg")}>{item.missing.length} à former</span>
          </p>
        </div>
        <span className="sr-only">{pct} % couverts</span>
        {!ok && (
          <Button variant="ghost" size="sm" iconEnd={ChevronDown} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Masquer" : "Qui n'est pas formé ?"}
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && !ok && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="mt-[0.9em] rounded-md bg-bg-sunken p-[1em]">
              <ul className="flex flex-wrap gap-x-[1.2em] gap-y-[0.6em]">
                {item.missing.slice(0, 12).map((e) => (
                  <li key={e.id} className="flex items-center gap-[0.5em] text-sm text-fg-secondary">
                    <Avatar employee={e} size="xs" />
                    {e.firstName} {e.lastName}
                  </li>
                ))}
                {item.missing.length > 12 && <li className="text-sm text-fg-muted">+ {item.missing.length - 12} autres</li>}
              </ul>
              {canManage && (
                <div className="mt-[1em] flex flex-wrap items-center gap-[0.8em] border-t border-border-subtle pt-[0.9em]">
                  {item.next && seatsLeft > 0 ? (
                    <>
                      <Button size="sm" icon={UserPlus} onClick={() => onEnrollMissing(item)}>
                        Inscrire {Math.min(seatsLeft, item.missing.length)} à la session du {dateShort(item.next.from)}
                      </Button>
                      {seatsLeft < item.missing.length && <span className="text-xs text-fg-muted">Il restera {item.missing.length - seatsLeft} personne(s) : prévoyez une session de plus.</span>}
                    </>
                  ) : (
                    <Button size="sm" onClick={() => onPlan(item)}>Planifier une session</Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function ComplianceBanner({ items, canManage, onEnrollMissing, onPlan }) {
  if (!items.length) return null;
  const gaps = items.reduce((s, i) => s + i.missing.length, 0);
  return (
    <section aria-label="Conformité des formations obligatoires" className={cn("rounded-lg border bg-surface p-[1.25em] shadow-sm", gaps ? "border-warning/50" : "border-border")}>
      <div className="mb-[1em] flex items-center justify-between gap-[1em]">
        <h2 className="text-h3 font-semibold text-fg">Formations obligatoires</h2>
        <span className={cn("text-sm", gaps ? "font-medium text-warning-fg" : "text-success-fg")}>
          {gaps ? `${gaps} personne${gaps > 1 ? "s" : ""} sans formation ni inscription` : "Tout le monde est couvert"}
        </span>
      </div>
      <ul className="divide-y divide-border-subtle">
        {items.map((it) => <Row key={it.title} item={it} canManage={canManage} onEnrollMissing={onEnrollMissing} onPlan={onPlan} />)}
      </ul>
    </section>
  );
}
