import { cn } from "@/lib/utils";

const tones = { primary: "var(--primary)", success: "var(--success)", warning: "var(--warning)", danger: "var(--danger)", info: "var(--info)", neutral: "var(--neutral)" };

/** Circular progress. value 0–100. Children render in the centre. */
export default function ProgressRing({ value, size = "4.5em", stroke = 9, tone = "primary", label, className, children }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 50 - stroke / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct)} %`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={stroke} />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={tones[tone]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 500ms var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children ?? <span className="text-sm font-semibold text-fg num">{Math.round(pct)}%</span>}</div>
    </div>
  );
}
