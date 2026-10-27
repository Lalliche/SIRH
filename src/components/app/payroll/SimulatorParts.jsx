"use client";

import { useId, useState } from "react";
import { TextInput } from "@/components/ui";
import { amount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { compact } from "./utils";

/** Slider + exact numeric entry (the kit has no range input yet). */
export function RangeField({ label, value, onChange, min, max, step, unit = "DA", hint }) {
  const id = useId();
  const [text, setText] = useState(null);
  return (
    <div>
      <div className="flex items-end justify-between gap-[1em]">
        <label htmlFor={id} className="text-[0.8125em] font-medium text-fg-secondary">{label}</label>
        <TextInput
          aria-label={`${label}, saisie exacte`}
          inputMode="decimal"
          value={text ?? String(value).replace(".", ",")}
          suffix={unit}
          className="w-[9.5em]"
          onChange={(v) => {
            setText(v);
            const n = Number(v.replace(/\s| /g, "").replace(",", "."));
            if (v.trim() !== "" && Number.isFinite(n) && n >= 0) onChange(n);
          }}
          onBlur={() => setText(null)}
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => {
          setText(null);
          onChange(Number(e.target.value));
        }}
        className="mt-[0.5em] h-[1.4em] w-full cursor-pointer accent-[var(--primary)]"
      />
      <div className="flex justify-between text-xs text-fg-muted num"><span>{amount(min, { decimals: 0 })}</span>{hint && <span>{hint}</span>}<span>{amount(max, { decimals: 0 })}</span></div>
    </div>
  );
}

const BAR = {
  gross: "bg-chart-1",
  deduction: "bg-chart-7",
  net: "bg-primary",
  employer: "bg-chart-3",
  cost: "bg-chart-4",
};

/** Horizontal gross → net waterfall. Every bar is labelled with its amount (never colour alone). */
export function Waterfall({ slip }) {
  const max = Math.max(slip.employerCost, 1);
  const pct = (v) => `${Math.max(0, (v / max) * 100)}%`;
  const retenues = slip.loanDeduction + slip.otherDeductions;
  const rows = [
    { key: "gross", label: "Salaire brut", from: 0, to: slip.gross, kind: "gross", sign: "" },
    { key: "cnas", label: "CNAS salarié", from: slip.gross - slip.cnasEmployee, to: slip.gross, kind: "deduction", sign: "−" },
    { key: "irg", label: "IRG", from: slip.gross - slip.cnasEmployee - slip.irg, to: slip.gross - slip.cnasEmployee, kind: "deduction", sign: "−" },
    ...(retenues ? [{ key: "ret", label: "Retenues", from: slip.net, to: slip.net + retenues, kind: "deduction", sign: "−" }] : []),
    { key: "net", label: "Net à payer", from: 0, to: slip.net, kind: "net", sign: "", strong: true },
    { key: "emp", label: "Charges patronales", from: slip.gross, to: slip.employerCost, kind: "employer", sign: "+" },
    { key: "cost", label: "Coût employeur", from: 0, to: slip.employerCost, kind: "cost", sign: "", strong: true },
  ];
  return (
    <ul className="flex flex-col gap-[0.55em]" aria-label="Du brut au net, puis au coût employeur">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[7.5em_1fr_7em] items-center gap-[0.8em] text-sm sm:grid-cols-[9em_1fr_8em]">
          <span className={cn("truncate", r.strong ? "font-semibold text-fg" : "text-fg-secondary")}>{r.label}</span>
          <div className="relative h-[1.5em] rounded-xs bg-bg-sunken" aria-hidden>
            <div className={cn("absolute inset-y-0 rounded-xs", BAR[r.kind])} style={{ insetInlineStart: pct(r.from), width: pct(r.to - r.from) }} />
          </div>
          <span className={cn("text-end num", r.strong ? "font-semibold text-fg" : "text-fg-secondary")}>{r.sign}{amount(r.to - r.from)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Net as a function of gross (from takeHomeCurve) with the current point and saved scenarios. */
export function TakeHomeChart({ curve, points = [], current }) {
  const w = 600;
  const h = 250;
  const L = 52;
  const B = 28;
  const maxG = curve.at(-1).gross;
  const maxN = Math.max(...curve.map((c) => c.net)) * 1.05;
  const x = (g) => L + ((g - curve[0].gross) / (maxG - curve[0].gross)) * (w - L - 10);
  const y = (n) => h - B - (n / maxN) * (h - B - 12);
  const line = curve.map((c, i) => `${i ? "L" : "M"}${x(c.gross).toFixed(1)} ${y(c.net).toFixed(1)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxN * t);
  const xTicks = [curve[0].gross, 100000, 200000, maxG];
  const inRange = (g) => g >= curve[0].gross && g <= maxG;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Courbe du net à payer en fonction du salaire brut">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={L} x2={w - 10} y1={y(t)} y2={y(t)} stroke="var(--border-subtle)" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{compact(t)}</text>
        </g>
      ))}
      {xTicks.map((g) => (
        <text key={g} x={x(g)} y={h - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{compact(g)}</text>
      ))}
      <line x1={x(curve[0].gross)} y1={y(curve[0].gross)} x2={x(maxG)} y2={y(Math.min(maxG, maxN))} stroke="var(--border-strong)" strokeDasharray="4 4" />
      <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {points.filter((p) => inRange(p.gross)).map((p) => (
        <g key={p.id}>
          <circle cx={x(p.gross)} cy={y(p.net)} r="5" fill="var(--surface)" stroke="var(--chart-4)" strokeWidth="2" />
          <text x={x(p.gross)} y={y(p.net) - 10} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">{p.name}</text>
        </g>
      ))}
      {current && inRange(current.gross) && (
        <g>
          <line x1={x(current.gross)} x2={x(current.gross)} y1={y(current.net)} y2={h - B} stroke="var(--primary)" strokeDasharray="3 3" />
          <circle cx={x(current.gross)} cy={y(current.net)} r="6" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
        </g>
      )}
      <text x={w - 10} y={14} textAnchor="end" fontSize="11" fill="var(--text-muted)">Net (DA) selon le brut (DA)</text>
    </svg>
  );
}
