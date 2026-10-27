import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success-bg text-success-fg [--dot:var(--success)]",
  warning: "bg-warning-bg text-warning-fg [--dot:var(--warning)]",
  danger: "bg-danger-bg text-danger-fg [--dot:var(--danger)]",
  info: "bg-info-bg text-info-fg [--dot:var(--info)]",
  neutral: "bg-neutral-bg text-neutral-fg [--dot:var(--neutral)]",
  brand: "bg-primary-soft text-link [--dot:var(--pine-500)]",
  plum: "bg-[color-mix(in_srgb,var(--chart-5)_16%,transparent)] text-[color-mix(in_srgb,var(--chart-5)_70%,var(--text))] [--dot:var(--chart-5)]",
};

export default function Badge({ tone = "neutral", dot = true, icon: Icon, className, children }) {
  return (
    <span className={cn("inline-flex h-[1.65em] items-center gap-[0.4em] rounded-sm px-[0.55em] text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {Icon ? <Icon className="size-[1em]" aria-hidden strokeWidth={2} /> : dot && <span aria-hidden className="size-[0.45em] rounded-full bg-[var(--dot)]" />}
      {children}
    </span>
  );
}

// Map a status config entry ({label, tone}) straight to a badge
export function StatusBadge({ status, map, ...props }) {
  const s = map[status] ?? { label: status, tone: "neutral" };
  return <Badge tone={s.tone} {...props}>{s.label}</Badge>;
}
