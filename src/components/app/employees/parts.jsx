import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { CONTRACT_TYPES } from "@/data/constants";
import { date } from "@/lib/format";
import { cn } from "@/lib/utils";
import { completeness } from "./helpers";

/** Dossier completeness: icon + label, never colour alone. */
export function CompletenessBadge({ employee, className }) {
  const c = completeness(employee);
  if (!c.missing.length) {
    return <Badge tone="success" icon={CheckCircle2} className={className}>Complet</Badge>;
  }
  const label = c.critical.length ? `Manque ${c.critical.map((m) => m.label).join(", ")}` : `${c.pct} %`;
  return (
    <Badge tone={c.critical.length ? "warning" : "neutral"} icon={CircleAlert} className={cn("max-w-[14em]", className)}>
      <span className="truncate" title={`Manque : ${c.missing.map((m) => m.label).join(", ")}`}>{label}</span>
    </Badge>
  );
}

export function ContractBadge({ contract, showEnd = false }) {
  if (!contract) return <span className="text-fg-muted">—</span>;
  return (
    <span className="inline-flex flex-col items-start gap-[0.15em]">
      <Badge tone={contract.type === "CDI" ? "neutral" : "info"} dot={false}>{CONTRACT_TYPES[contract.type] ?? contract.type}</Badge>
      {showEnd && contract.endDate && <span className="text-xs text-fg-muted num">jusqu’au {date(contract.endDate)}</span>}
    </span>
  );
}

/** Name cell: the only link-styled element of a row (text colour, underline on hover — no blue). */
export function NameCell({ employee, sub = "matricule", href }) {
  const subText = sub === "matricule" ? employee.matricule : sub === "email" ? employee.email : sub;
  return (
    <Link href={href ?? `/app/employees/${employee.id}`} onClick={(e) => e.stopPropagation()} className="group flex min-w-0 items-center gap-[0.75em]">
      <Avatar employee={employee} size="sm" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg group-hover:underline">{employee.firstName} {employee.lastName}</span>
        <span className={cn("block truncate text-xs text-fg-muted", sub === "matricule" && "font-mono")}>{subText}</span>
      </span>
    </Link>
  );
}

/** Label / value row used in definition lists. */
export function DefRow({ label, children, className }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-[1em] border-b border-border-subtle py-[0.7em] last:border-b-0", className)}>
      <dt className="shrink-0 text-sm text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-end text-fg">{children}</dd>
    </div>
  );
}
