import { DRIVERS } from "./compute";

const SIZE = 300;
const C = SIZE / 2;
const R = 92;
const pt = (i, v) => {
  const a = (Math.PI * 2 * i) / DRIVERS.length - Math.PI / 2;
  return [C + Math.cos(a) * R * (v / 100), C + Math.sin(a) * R * (v / 100)];
};
const poly = (scores) => DRIVERS.map((d, i) => pt(i, scores[d.key]).map((n) => n.toFixed(1)).join(",")).join(" ");

/** Hexagonal radar: current group vs company reference. */
export default function Radar({ scores, reference, label }) {
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[22em]" role="img" aria-label={`Radar des six facteurs. ${DRIVERS.map((d) => `${d.label} ${scores[d.key]}`).join(", ")}`}>
        {[25, 50, 75, 100].map((ring) => (
          <polygon key={ring} points={DRIVERS.map((_, i) => pt(i, ring).join(",")).join(" ")} fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
        ))}
        {DRIVERS.map((d, i) => {
          const [x, y] = pt(i, 100);
          const [lx, ly] = pt(i, 122);
          return (
            <g key={d.key}>
              <line x1={C} y1={C} x2={x} y2={y} stroke="var(--border-subtle)" />
              <text x={lx} y={ly} textAnchor={lx < C - 4 ? "end" : lx > C + 4 ? "start" : "middle"} dominantBaseline="middle" fontSize="11" fill="var(--text-secondary)">{d.label}</text>
            </g>
          );
        })}
        {reference && <polygon points={poly(reference)} fill="none" stroke="var(--chart-4)" strokeWidth="1.6" strokeDasharray="4 3" />}
        <polygon points={poly(scores)} fill="var(--chart-1)" fillOpacity="0.14" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" />
        {DRIVERS.map((d, i) => { const [x, y] = pt(i, scores[d.key]); return <circle key={d.key} cx={x} cy={y} r="3" fill="var(--surface)" stroke="var(--chart-1)" strokeWidth="1.6" />; })}
      </svg>
      <figcaption className="mt-[0.4em] flex flex-wrap justify-center gap-x-[1.2em] gap-y-[0.3em] text-xs text-fg-muted">
        <span className="flex items-center gap-[0.4em]"><span aria-hidden className="h-[0.2em] w-[1.4em] rounded-full bg-chart-1" />{label}</span>
        {reference && <span className="flex items-center gap-[0.4em]"><span aria-hidden className="w-[1.4em] border-t-2 border-dashed border-chart-4" />Entreprise</span>}
      </figcaption>
    </figure>
  );
}
