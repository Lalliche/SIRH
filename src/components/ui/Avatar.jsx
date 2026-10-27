import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const sizes = { xs: "size-[1.5em] text-[0.6em]", sm: "size-[2em] text-[0.7em]", md: "size-[2.5em] text-[0.85em]", lg: "size-[3.5em] text-[1.1em]", xl: "size-[5em] text-[1.6em]" };

export default function Avatar({ employee, name, size = "md", className }) {
  const first = employee?.firstName ?? name?.split(" ")[0];
  const last = employee?.lastName ?? name?.split(" ").slice(1).join(" ");
  const tint = employee?.tint ?? "#0e6560";
  return (
    <span
      aria-hidden
      style={{ backgroundColor: `color-mix(in srgb, ${tint} 16%, transparent)`, color: `color-mix(in srgb, ${tint} 78%, var(--text))` }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", sizes[size], className)}
    >
      {initials(first, last)}
    </span>
  );
}

export function PersonCell({ employee, sub, size = "sm" }) {
  if (!employee) return <span className="text-fg-muted">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-[0.75em]">
      <Avatar employee={employee} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{employee.firstName} {employee.lastName}</span>
        {sub && <span className="block truncate text-xs text-fg-muted">{sub}</span>}
      </span>
    </span>
  );
}
