import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import Card from "./Card";
import { Sparkline } from "./charts";

export function Delta({ value, suffix = " %", goodWhen = "up", className }) {
  if (value == null) return null;
  const up = value > 0;
  const flat = value === 0;
  const good = flat ? null : goodWhen === "up" ? up : !up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-[0.2em] rounded-sm px-[0.45em] text-xs font-medium", flat ? "bg-neutral-bg text-neutral-fg" : good ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg", className)}>
      <Icon className="size-[1em]" aria-hidden />
      {up ? "+" : ""}{String(value).replace(".", ",")}{suffix}
    </span>
  );
}

export default function KpiCard({ label, value, delta, deltaGoodWhen, hint, spark, accent = false, icon: Icon, className }) {
  return (
    <Card className={cn("relative overflow-hidden !p-[1.25em]", accent && "border-t-2 border-t-primary", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">{label}</p>
        {Icon && <Icon className="size-[1.15em] text-fg-faint" aria-hidden strokeWidth={1.6} />}
      </div>
      <p className="mt-[0.5em] font-display text-kpi font-semibold text-fg">{value}</p>
      <div className="mt-[0.5em] flex items-center justify-between gap-[0.5em]">
        <div className="flex items-center gap-[0.5em]">
          {delta != null && <Delta value={delta} goodWhen={deltaGoodWhen} />}
          {hint && <span className="text-xs text-fg-muted">{hint}</span>}
        </div>
        {spark && <Sparkline data={spark} className="h-[2em] w-[5em]" />}
      </div>
    </Card>
  );
}
