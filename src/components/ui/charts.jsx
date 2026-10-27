"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

// Tiny dependency-free SVG charts using design-system chart tokens.

function scale(data, pad = 0.1) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  return { lo: min - span * pad, hi: max + span * pad };
}

export function Sparkline({ data, color = "var(--chart-1)", className, fill = true }) {
  const id = useId();
  const w = 100;
  const h = 32;
  const { lo, hi } = scale(data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - lo) / (hi - lo)) * h]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("overflow-visible", className)} aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** series: [{ name, color, data:number[] }]; labels: string[] */
export function AreaChart({ series, labels, height = 220, format = (v) => v, className }) {
  const id = useId();
  const w = 600;
  const h = height;
  const padL = 44;
  const padB = 24;
  const all = series.flatMap((s) => s.data);
  const hi = Math.max(...all) * 1.08;
  const lo = 0;
  const x = (i) => padL + (i / (labels.length - 1)) * (w - padL - 8);
  const y = (v) => h - padB - ((v - lo) / (hi - lo)) * (h - padB - 10);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + (hi - lo) * t);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={w - 8} y1={y(t)} y2={y(t)} stroke="var(--border-subtle)" />
          <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{format(t)}</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l + i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{l}</text>
      ))}
      {series.map((s, si) => {
        const line = s.data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
        return (
          <g key={s.name}>
            <defs>
              <linearGradient id={`${id}-${si}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.14" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line} L${x(s.data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={`url(#${id}-${si})`} />
            <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {s.data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--surface)" stroke={s.color} strokeWidth="1.6" />)}
          </g>
        );
      })}
    </svg>
  );
}

/** items: [{ label, value, color? }] horizontal bars */
export function BarList({ items, format = (v) => v, className }) {
  const max = Math.max(...items.map((i) => i.value)) || 1;
  return (
    <ul className={cn("flex flex-col gap-[0.8em]", className)}>
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="mb-[0.3em] flex justify-between text-sm">
            <span className="text-fg-secondary">{it.label}</span>
            <span className="font-medium text-fg num">{format(it.value)}</span>
          </div>
          <div className="h-[0.5em] overflow-hidden rounded-full bg-bg-sunken">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? `var(--chart-${(i % 8) + 1})` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical columns. data: [{label, value}] */
export function ColumnChart({ data, height = 180, format = (v) => v, color = "var(--chart-1)", highlight, className }) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className={cn("flex items-end gap-[0.6em]", className)} style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-[0.4em]" style={{ height: "100%" }}>
          <span className="text-[0.7em] text-fg-muted num">{format(d.value)}</span>
          <div
            className="w-full rounded-t-[0.25em]"
            style={{ height: `${(d.value / max) * 78}%`, minHeight: 4, background: d.label === highlight ? "var(--accent)" : color, opacity: d.label === highlight ? 1 : 0.85 }}
          />
          <span className="text-[0.7em] text-fg-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut with ≤5 slices. items: [{label,value}] */
export function Donut({ items, size = 140, thickness = 18, center, className }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offsets = items.map((_, i) => items.slice(0, i).reduce((sum, it) => sum + (it.value / total) * c, 0));
  return (
    <div className={cn("flex items-center gap-[1.5em]", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={thickness} />
          {items.map((it, i) => {
            const len = (it.value / total) * c;
            return <circle key={it.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={it.color ?? `var(--chart-${(i % 8) + 1})`} strokeWidth={thickness} strokeDasharray={`${len - 2} ${c - len + 2}`} strokeDashoffset={-offsets[i]} />;
          })}
        </svg>
        {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
      </div>
      <ul className="flex flex-col gap-[0.5em] text-sm">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-[0.6em]">
            <span className="size-[0.7em] rounded-full" style={{ background: it.color ?? `var(--chart-${(i % 8) + 1})` }} />
            <span className="text-fg-secondary">{it.label}</span>
            <span className="ms-auto ps-[0.8em] font-medium text-fg num">{it.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Progress({ value, max = 100, tone = "primary", className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const bg = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div className={cn("h-[0.5em] overflow-hidden rounded-full bg-bg-sunken", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}
