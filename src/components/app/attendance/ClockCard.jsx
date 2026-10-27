"use client";

import { useMemo } from "react";
import { LogIn, LogOut, Home, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, toast } from "@/components/ui";
import { ATTENDANCE_STATUS } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { holidayOn, isWeekend } from "@/lib/dates";
import { useCollection } from "@/lib/db";
import { dateLong } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { clockIn, clockOut } from "./attendance-actions";
import { fmtHours, hoursWorked } from "./attendance-utils";

/** Self clock-in/out for the current user (today = TODAY constant, time = browser clock at click). */
export default function ClockCard() {
  const me = useCurrentUser();
  const attendance = useCollection("attendance");
  const rec = useMemo(() => attendance.find((a) => a.id === `${TODAY}:${me.employeeId}`), [attendance, me.employeeId]);
  const off = isWeekend(TODAY) || holidayOn(TODAY);
  const onLeave = rec?.status === "leave";
  const worked = rec ? hoursWorked(rec.in, rec.out) : null;
  const undoToast = (msg, undo) => toast.success(msg, { action: { label: "Annuler", onClick: undo } });

  return (
    <Card className="flex flex-col gap-[0.9em]">
      <div className="flex items-start justify-between gap-[0.75em]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Mon pointage</p>
          <p className="mt-[0.2em] text-sm capitalize text-fg-secondary">{dateLong(TODAY)}</p>
        </div>
        {rec && <Badge tone={ATTENDANCE_STATUS[rec.status]?.tone ?? "neutral"}>{ATTENDANCE_STATUS[rec.status]?.label}</Badge>}
      </div>

      {off ? (
        <p className="text-sm text-fg-secondary">Jour non travaillé.</p>
      ) : onLeave ? (
        <p className="text-sm text-fg-secondary">Vous êtes en congé aujourd’hui.</p>
      ) : !rec?.in ? (
        <>
          <p className="text-sm text-fg-secondary">Vous n’avez pas encore pointé votre arrivée.</p>
          <div className="flex flex-wrap gap-[0.5em]">
            <Button size="lg" icon={LogIn} onClick={() => { const u = clockIn(me.employeeId); undoToast("Arrivée pointée", u); }}>Pointer mon arrivée</Button>
            <Button size="lg" variant="secondary" icon={Home} onClick={() => { const u = clockIn(me.employeeId, { remote: true }); undoToast("Arrivée pointée en télétravail", u); }}>Télétravail</Button>
          </div>
        </>
      ) : !rec.out ? (
        <>
          <p className="text-sm text-fg-secondary">Arrivée à <strong className="font-semibold text-fg num">{rec.in}</strong>. Bonne journée !</p>
          <div><Button size="lg" variant="secondary" icon={LogOut} onClick={() => { const u = clockOut(me.employeeId); undoToast("Départ pointé", u); }}>Pointer mon départ</Button></div>
        </>
      ) : (
        <p className="flex items-center gap-[0.5em] text-sm text-fg-secondary">
          <CheckCircle2 className="size-[1.2em] text-success" aria-hidden /> {rec.in} → {rec.out} · <strong className="font-semibold text-fg num">{fmtHours(worked)}</strong> travaillées
        </p>
      )}
    </Card>
  );
}
