import { Avatar } from "@/components/ui";
import { date } from "@/lib/format";
import { tenureLabel } from "./leave-utils";

/** Compact employee identity block used in context cards and drawers. */
export default function EmployeeBrief({ employee, position, department, size = "lg", extra }) {
  if (!employee) return null;
  return (
    <div className="flex items-center gap-[0.9em]">
      <Avatar employee={employee} size={size} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-fg">{employee.firstName} {employee.lastName}</p>
        <p className="truncate text-sm text-fg-secondary">{[position, department].filter(Boolean).join(" · ")}</p>
        <p className="text-xs text-fg-muted">
          <span className="font-mono">{employee.matricule}</span> · {tenureLabel(employee.hireDate)} d’ancienneté (depuis le {date(employee.hireDate)})
        </p>
        {extra}
      </div>
    </div>
  );
}
