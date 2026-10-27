"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { daysInMonth, weekday } from "@/lib/dates";
import { WEEKDAYS_SHORT, periodLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const DOT = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-info", neutral: "bg-neutral" };
const HATCH = "bg-[repeating-linear-gradient(135deg,transparent_0_0.35em,var(--border-subtle)_0.35em_0.45em)]";

export function shiftMonth(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export default function CalendarGrid({ month, onMonth, events, selected, onSelect, today }) {
  const cells = useMemo(() => {
    const lead = weekday(`${month}-01`);
    const total = daysInMonth(month);
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);
  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of events) if (e.date.startsWith(month)) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events, month]);
  const title = periodLabel(month);

  return (
    <div>
      <div className="mb-[0.8em] flex items-center justify-between gap-[0.6em]">
        <h3 className="text-h3 font-semibold capitalize text-fg" aria-live="polite">{title}</h3>
        <div className="flex items-center gap-[0.3em]">
          <Button variant="secondary" size="icon" aria-label="Mois précédent" onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft className="size-[1.2em]" /></Button>
          <Button variant="secondary" size="sm" onClick={() => onMonth(today.slice(0, 7))}>Aujourd’hui</Button>
          <Button variant="secondary" size="icon" aria-label="Mois suivant" onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight className="size-[1.2em]" /></Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div role="row" className="grid grid-cols-7 bg-bg-sunken text-center text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
          {WEEKDAYS_SHORT.map((d) => <div key={d} role="columnheader" className="py-[0.6em]">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`b${i}`} className="min-h-[3.4em] border-t border-border-subtle bg-surface-2 md:min-h-[5.4em]" />;
            const evs = byDay.get(iso) ?? [];
            const col = i % 7;
            const weekend = col === 5 || col === 6;
            const isToday = iso === today;
            const isSel = iso === selected;
            return (
              <Button
                key={iso}
                variant="ghost"
                onClick={() => onSelect(iso)}
                aria-pressed={isSel}
                aria-label={`${Number(iso.slice(8))} ${title}${evs.length ? `, ${evs.length} échéance${evs.length > 1 ? "s" : ""}` : ""}`}
                className={cn(
                  "!h-auto min-h-[3.4em] flex-col !items-start !justify-start gap-[0.2em] !rounded-none border-t border-border-subtle !p-[0.4em] font-normal md:min-h-[5.4em]",
                  weekend && HATCH,
                  isSel && "bg-primary-soft",
                )}
              >
                <span className={cn("flex size-[1.7em] items-center justify-center rounded-full text-xs num", isToday ? "bg-accent font-semibold text-white" : "text-fg-secondary")}>{Number(iso.slice(8))}</span>
                <span className="hidden w-full flex-col gap-[0.15em] md:flex">
                  {evs.slice(0, 2).map((e) => (
                    <span key={e.id} className="flex w-full items-center gap-[0.35em] truncate text-start text-[0.7em] leading-tight text-fg-secondary">
                      <span aria-hidden className={cn("size-[0.6em] shrink-0 rounded-full", DOT[e.tone])} />
                      <span className="truncate">{e.label}</span>
                    </span>
                  ))}
                  {evs.length > 2 && <span className="text-start text-[0.7em] text-fg-muted">+{evs.length - 2} autre{evs.length > 3 ? "s" : ""}</span>}
                </span>
                <span className="flex gap-[0.2em] md:hidden" aria-hidden>
                  {evs.slice(0, 3).map((e) => <span key={e.id} className={cn("size-[0.5em] rounded-full", DOT[e.tone])} />)}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
      <p className="mt-[0.6em] flex flex-wrap gap-x-[1.2em] gap-y-[0.3em] text-xs text-fg-muted">
        <span className="inline-flex items-center gap-[0.4em]"><span className={cn("inline-block size-[1.1em] rounded-xs border border-border", HATCH)} aria-hidden />Vendredi et samedi : week-end</span>
        <span className="inline-flex items-center gap-[0.4em]"><span className="inline-block size-[0.9em] rounded-full bg-accent" aria-hidden />Aujourd’hui</span>
      </p>
    </div>
  );
}
