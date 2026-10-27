import { LEAVE_TYPES } from "@/data/constants";
import { cn } from "@/lib/utils";

/** Colored swatch + label. The swatch uses the same tint recipe as the calendar bars. */
export function LeaveSwatch({ type, className }) {
  const color = LEAVE_TYPES[type]?.color ?? "var(--chart-7)";
  return (
    <span
      aria-hidden
      className={cn("inline-block size-[0.8em] shrink-0 rounded-xs border", className)}
      style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 35%, var(--surface))` }}
    />
  );
}

export default function LeaveTypeTag({ type, className }) {
  const t = LEAVE_TYPES[type];
  return (
    <span className={cn("inline-flex items-center gap-[0.5em] whitespace-nowrap", className)}>
      <LeaveSwatch type={type} />
      {t?.label ?? type}
    </span>
  );
}
