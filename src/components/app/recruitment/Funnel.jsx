import { cn } from "@/lib/utils";
import { STAGES, funnelOf, stageCounts } from "./helpers";

const stageColor = { new: "var(--chart-7)", screening: "var(--chart-4)", interview: "var(--chart-1)", offer: "var(--chart-3)", hired: "var(--chart-6)", rejected: "var(--chart-8)" };

/** Compact stacked bar of candidates per stage (jobs list). */
export function FunnelMini({ candidates }) {
  const counts = stageCounts(candidates);
  const total = candidates.length;
  const label = STAGES.filter((s) => counts[s.key]).map((s) => `${counts[s.key]} ${s.label.toLowerCase()}`).join(", ");
  if (!total) return <span className="text-xs text-fg-muted">Aucune candidature</span>;
  return (
    <div className="min-w-[9em]" role="img" aria-label={label}>
      <div className="flex h-[0.55em] gap-[2px] overflow-hidden rounded-full">
        {STAGES.filter((s) => counts[s.key]).map((s) => (
          <span key={s.key} title={`${s.label} : ${counts[s.key]}`} style={{ flex: counts[s.key], background: stageColor[s.key] }} />
        ))}
      </div>
      <p className="mt-[0.35em] text-xs text-fg-muted num">{counts.new + counts.screening} à traiter · {counts.interview + counts.offer} avancés</p>
    </div>
  );
}

/** Cumulative funnel with step conversion (job page). */
export function Funnel({ candidates, className }) {
  const steps = funnelOf(candidates);
  const max = Math.max(1, steps[0].value);
  return (
    <ol className={cn("flex flex-col gap-[0.5em]", className)} aria-label="Entonnoir de recrutement">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].value : null;
        return (
          <li key={s.label} className="grid grid-cols-[6.5em_1fr_auto] items-center gap-[0.7em] text-sm">
            <span className="text-fg-secondary">{s.label}</span>
            <span className="h-[1.1em] overflow-hidden rounded-sm bg-bg-sunken">
              <span className="block h-full rounded-sm bg-chart-1" style={{ width: `${(s.value / max) * 100}%`, opacity: 1 - i * 0.12 }} />
            </span>
            <span className="w-[5.5em] text-end text-fg num">
              <span className="font-medium">{s.value}</span>
              {prev ? <span className="ms-[0.4em] text-xs text-fg-muted">{prev ? Math.round((s.value / prev) * 100) : 0} %</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
