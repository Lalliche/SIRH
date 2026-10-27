"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TODAY } from "@/lib/clock";
import { addDays, isWeekend, toDate, toIso } from "@/lib/dates";
import { monthName, WEEKDAYS_SHORT } from "@/lib/format";
import { statusOf } from "./helpers";

const chipTone = {
  planned: "bg-info-bg text-info-fg",
  inprogress: "bg-primary-soft text-link",
  done: "bg-success-bg text-success-fg",
  cancelled: "bg-neutral-bg text-neutral-fg line-through",
};

function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return toIso(d).slice(0, 7);
}

export default function TrainingCalendar({ trainings, onOpen }) {
  const [month, setMonth] = useState(TODAY.slice(0, 7));
  const [y, m] = month.split("-").map(Number);

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const start = addDays(first, -toDate(first).getUTCDay()); // week starts Sunday
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const rows = cells.length / 7;
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-[1.25em] py-[0.8em]">
        <h2 className="text-h3 font-semibold capitalize text-fg" aria-live="polite">{monthName(m)} {y}</h2>
        <div className="flex items-center gap-[0.4em]">
          <Button variant="secondary" size="icon" aria-label="Mois précédent" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="size-[1.2em]" /></Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(TODAY.slice(0, 7))}>Aujourd&apos;hui</Button>
          <Button variant="secondary" size="icon" aria-label="Mois suivant" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="size-[1.2em]" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-sunken text-center text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
        {WEEKDAYS_SHORT.map((d) => <div key={d} className="py-[0.6em]">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.slice(0, rows * 7).map((day, i) => {
          const inMonth = day.startsWith(month);
          const weekend = isWeekend(day);
          const here = trainings.filter((t) => t.from <= day && day <= t.to);
          return (
            <div
              key={day}
              className={cn(
                "min-h-[5.2em] border-b border-s border-border-subtle p-[0.35em] sm:min-h-[6.5em]",
                i % 7 === 0 && "border-s-0",
                !inMonth && "bg-bg-sunken/60",
                weekend && "bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--border-subtle)_5px_6px)]",
              )}
            >
              <span className={cn("inline-flex size-[1.7em] items-center justify-center rounded-full text-xs num", day === TODAY ? "bg-accent text-white font-semibold" : inMonth ? "text-fg-secondary" : "text-fg-faint")}>
                {Number(day.slice(8))}
              </span>
              <div className="mt-[0.2em] flex flex-col gap-[0.2em]">
                {here.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpen(t.id)}
                    title={t.title}
                    className={cn("flex w-full items-center gap-[0.3em] truncate rounded-xs px-[0.4em] py-[0.15em] text-start text-[0.72em] font-medium transition-[filter] hover:brightness-95", chipTone[statusOf(t)])}
                  >
                    {t.mandatory && <ShieldAlert className="size-[1em] shrink-0" aria-label="Obligatoire" />}
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {here.length > 2 && <span className="px-[0.4em] text-[0.72em] text-fg-muted">+ {here.length - 2}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="border-t border-border-subtle px-[1.25em] py-[0.7em] text-xs text-fg-muted">Vendredi et samedi hachurés (week-end). Le jour courant est repéré en couleur.</p>
    </div>
  );
}
