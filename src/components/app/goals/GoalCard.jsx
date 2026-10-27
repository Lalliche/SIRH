"use client";

import { CalendarClock, Check, UserCheck } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import ProgressRing from "@/components/app/_kit/ProgressRing";
import { dateShort, fullName } from "@/lib/format";
import { GOAL_STATUS } from "./helpers";

export function StatusChip({ status }) {
  const s = GOAL_STATUS[status] ?? GOAL_STATUS.on_track;
  return <Badge tone={s.tone} icon={status === "done" ? Check : undefined}>{s.label}</Badge>;
}

export default function GoalCard({ goal, owner, reviewer, onOpen }) {
  const krs = goal.keyResults ?? [];
  const done = krs.filter((k) => k.progress >= 100).length;
  const s = GOAL_STATUS[goal.status] ?? GOAL_STATUS.on_track;
  return (
    <Card as="button" type="button" interactive onClick={onOpen} className="flex w-full flex-col gap-[1em] text-start" aria-label={`Ouvrir l'objectif : ${goal.title}`}>
      <div className="flex items-start gap-[1em]">
        <ProgressRing value={goal.progress} tone={s.ring} size="4.4em" label={`${goal.progress} % d'avancement`} />
        <div className="min-w-0 flex-1">
          <StatusChip status={goal.status} />
          <h3 className="mt-[0.45em] text-balance font-semibold leading-snug text-fg">{goal.title}</h3>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-[1em] gap-y-[0.4em] text-xs text-fg-muted">
        <span className="flex items-center gap-[0.5em]"><Avatar employee={owner} size="xs" />{owner ? fullName(owner) : "—"}</span>
        <span className="flex items-center gap-[0.35em]" title="Évaluateur"><UserCheck className="size-[1.1em]" aria-hidden />{reviewer ? `${reviewer.firstName} ${reviewer.lastName[0]}.` : "—"}</span>
        <span className="flex items-center gap-[0.35em]"><CalendarClock className="size-[1.1em]" aria-hidden />{dateShort(goal.dueDate)}</span>
      </div>
      {krs.length > 0 && (
        <div className="flex items-center gap-[0.8em] border-t border-border-subtle pt-[0.8em]">
          <ul className="flex flex-1 gap-[0.3em]" aria-hidden>
            {krs.map((k) => (
              <li key={k.id} className="h-[0.35em] flex-1 overflow-hidden rounded-full bg-bg-sunken">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${k.progress}%` }} />
              </li>
            ))}
          </ul>
          <span className="text-xs text-fg-muted num">{done}/{krs.length} résultats clés</span>
        </div>
      )}
    </Card>
  );
}
