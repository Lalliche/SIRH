"use client";

import { Progress, PersonCell } from "@/components/ui";
import { GOAL_STATUS } from "./helpers";
import { Badge } from "@/components/ui";

export default function TeamRollup({ goals, employees, onPick }) {
  const owners = [...new Set(goals.map((g) => g.employeeId))]
    .map((id) => {
      const mine = goals.filter((g) => g.employeeId === id);
      const avg = Math.round(mine.reduce((s, g) => s + g.progress, 0) / mine.length);
      const count = (st) => mine.filter((g) => g.status === st).length;
      return { employee: employees.find((e) => e.id === id), n: mine.length, avg, counts: Object.keys(GOAL_STATUS).map((k) => [k, count(k)]).filter(([, c]) => c) };
    })
    .filter((o) => o.employee)
    .sort((a, b) => a.avg - b.avg);

  return (
    <section aria-labelledby="rollup" className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-[1.25em] py-[0.9em]">
        <h2 id="rollup" className="text-h3 font-semibold text-fg">Synthèse par personne</h2>
        <span className="text-xs text-fg-muted">Du plus en retard au plus avancé</span>
      </div>
      <ul className="divide-y divide-border-subtle">
        {owners.map((o) => (
          <li key={o.employee.id}>
            <button type="button" onClick={() => onPick(o.employee.id)} className="grid w-full items-center gap-x-[1.2em] gap-y-[0.5em] px-[1.25em] py-[0.8em] text-start transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
              <PersonCell employee={o.employee} sub={`${o.n} objectif${o.n > 1 ? "s" : ""}`} />
              <span className="flex items-center gap-[0.8em]">
                <Progress className="flex-1" value={o.avg} tone={o.avg < 35 ? "danger" : o.avg < 60 ? "warning" : "primary"} />
                <span className="w-[3em] text-end text-sm font-medium text-fg num">{o.avg} %</span>
              </span>
              <span className="flex flex-wrap gap-[0.3em]">
                {o.counts.map(([k, c]) => <Badge key={k} tone={GOAL_STATUS[k].tone}>{c} · {GOAL_STATUS[k].label}</Badge>)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
