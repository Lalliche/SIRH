"use client";

import { motion } from "motion/react";
import { CalendarDays, CalendarOff, CircleDollarSign, Inbox, Megaphone, Receipt, Users, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, KpiCard, PageHeader, Progress, StatusBadge, toast } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { teamOf } from "@/components/app/_kit/metrics";
import { ATTENDANCE_STATUS, LEAVE_STATUS, LEAVE_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { HOLIDAYS, diffDays, weekday } from "@/lib/dates";
import { db, useCollection } from "@/lib/db";
import { WEEKDAYS, date, dateLong, fullName, int, money, periodLabel } from "@/lib/format";
import { variants } from "@/lib/motion-tokens";
import { EventsCard, KpiLink, LeaveStrip, PayrollTracker, TodoCard, TrendCard, CostByDept, countNode, moneyCount } from "./widgets";
import CountUp from "./CountUp";
import { pluralFr, useDashboardData } from "./data";

const todayLabel = `${WEEKDAYS[weekday(TODAY)]} ${dateLong(TODAY)}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pct1 = (v) => `${v.toFixed(1).replace(".", ",")} %`;

function Stage({ children }) {
  return (
    <motion.div variants={variants.container} initial="hidden" animate="show" className="flex flex-col gap-[1.25em]">
      {children}
    </motion.div>
  );
}
const Rise = ({ children, className }) => <motion.div variants={variants.rise} className={className}>{children}</motion.div>;

export default function Dashboard() {
  return (
    <AccessGate>
      {(user) => {
        if (user.role === "manager") return <ManagerView user={user} />;
        if (user.role === "employee") return <EmployeeView user={user} />;
        if (user.role === "accountant") return <AccountantView user={user} />;
        return <LeadView user={user} />;
      }}
    </AccessGate>
  );
}

function Greeting({ user, description, actions }) {
  return (
    <PageHeader
      eyebrow={cap(todayLabel)}
      title={`Bonjour ${user.employee?.firstName ?? ""}`}
      description={description}
      actions={
        <>
          <Badge tone="neutral" icon={CalendarDays}>Octobre 2026</Badge>
          {actions}
        </>
      }
      className="!mb-[1.25em]"
    />
  );
}

/* ------------------------------------------------------------------ Admin / RH */

function LeadView({ user }) {
  const d = useDashboardData();
  const company = "Tassili Industries SPA";
  return (
    <Stage>
      <Rise>
        <Greeting
          user={user}
          description={`${company} · ${user.role === "admin" ? "voici l'état de l'entreprise ce matin." : "voici ce qui attend l'équipe RH aujourd'hui."}`}
          actions={<Button href="/app/payroll" icon={Wallet}>{d.run ? "Suivre la paie" : "Préparer la paie"}</Button>}
        />
      </Rise>

      <Rise className="grid grid-cols-1 gap-[1em] sm:grid-cols-2 xl:grid-cols-4">
        <KpiLink href="/app/employees" icon={Users} label="Effectif actif" value={countNode(d.kpi.headcount.value)} delta={d.kpi.headcount.delta} hint="vs sept." spark={d.kpi.headcount.spark} />
        <KpiLink href="/app/payroll" icon={CircleDollarSign} label="Masse salariale brute" value={countNode(d.kpi.gross.value, moneyCount)} delta={d.kpi.gross.delta} hint="vs sept. (prév.)" spark={d.kpi.gross.spark} accent />
        <KpiLink href="/app/attendance" icon={CalendarOff} label="Absentéisme" value={countNode(d.kpi.absence.value, pct1)} delta={d.kpi.absence.delta} deltaGoodWhen="down" hint="7 derniers jours" spark={d.kpi.absence.spark} />
        <KpiLink href="/app/inbox" icon={Inbox} label="Congés en attente" value={countNode(d.kpi.leave.value)} hint="à traiter" spark={d.kpi.leave.spark} />
      </Rise>

      <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-[1.25em]">
          <Rise><PayrollTracker steps={d.steps} done={d.doneSteps} cta={{ label: d.run ? "Ouvrir le run" : "Saisir les variables", href: d.run ? `/app/payroll/runs/${d.run.id}` : "/app/payroll" }} /></Rise>
          <Rise className="grid gap-[1.25em] xl:grid-cols-2"><TrendCard trend={d.trend} /><CostByDept items={d.byDept} /></Rise>
          <Rise><LeaveStrip leaves={d.leaveRequests} employees={d.employees} /></Rise>
        </div>
        <div className="flex min-w-0 flex-col gap-[1.25em]">
          <Rise><TodoCard tasks={d.tasks} /></Rise>
          <Rise><EventsCard events={d.events} /></Rise>
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ Comptable */

function AccountantView({ user }) {
  const d = useDashboardData();
  const decl = d.declarations.filter((x) => x.status === "todo").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  const payrollTasks = d.tasks.filter((t) => ["snmg", "cnas", "payroll", "decl"].includes(t.id));
  return (
    <Stage>
      <Rise><Greeting user={user} description="Paie, charges sociales et déclarations du mois." actions={<Button href="/app/payroll" icon={Wallet}>Ouvrir la paie</Button>} /></Rise>
      <Rise className="grid grid-cols-1 gap-[1em] sm:grid-cols-2 xl:grid-cols-4">
        <KpiLink href="/app/payroll" icon={CircleDollarSign} label="Masse salariale brute" value={countNode(d.forecast.gross, moneyCount)} delta={d.kpi.gross.delta} hint="prévision" spark={d.trend.gross} accent />
        <KpiLink href="/app/payroll" icon={Receipt} label="Net à payer" value={countNode(d.forecast.net, moneyCount)} spark={d.trend.net} hint="prévision" />
        <KpiLink href="/app/reports" icon={Wallet} label="Coût employeur" value={countNode(d.forecast.employerCost, moneyCount)} spark={d.trend.employerCost} hint="charges incluses" />
        <KpiLink href="/app/payroll/declarations" icon={CalendarDays} label="Déclarations à déposer" value={countNode(d.declarations.filter((x) => x.status === "todo").length)} hint="G50, CNAS, DAS, G29" />
      </Rise>
      <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-[1.25em]">
          <Rise><PayrollTracker steps={d.steps} done={d.doneSteps} /></Rise>
          <Rise className="grid gap-[1.25em] xl:grid-cols-2"><TrendCard trend={d.trend} /><CostByDept items={d.byDept} /></Rise>
        </div>
        <div className="flex min-w-0 flex-col gap-[1.25em]">
          <Rise><TodoCard tasks={payrollTasks} title="Contrôles avant paie" description="Anomalies qui bloqueraient le calcul." /></Rise>
          <Rise>
            <Card>
              <CardHeader title="Échéances" description="Déclarations à venir" action={<Button href="/app/payroll/declarations" variant="ghost" size="sm">Tout voir</Button>} />
              <ul>
                {decl.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-[1em] border-b border-border-subtle py-[0.6em] last:border-b-0">
                    <span><span className="block text-sm font-medium text-fg">{x.kind} · {x.period.length > 4 ? periodLabel(x.period) : x.period}</span><span className="text-xs text-fg-muted">avant le {date(x.dueDate)}</span></span>
                    <Badge tone="warning">dans {diffDays(TODAY, x.dueDate)} j</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </Rise>
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ Manager */

function ManagerView({ user }) {
  const me = user.employee;
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const leaves = useCollection("leaveRequests");
  const attendance = useCollection("attendance");
  const d = useDashboardData();
  const team = teamOf(employees, departments, me?.id);
  const ids = new Set(team.map((e) => e.id));
  const today = Object.fromEntries(attendance.filter((a) => a.date === TODAY && ids.has(a.employeeId)).map((a) => [a.employeeId, a]));
  const statusOf = (e) => today[e.id]?.status ?? "pending";
  const count = (s) => team.filter((e) => statusOf(e) === s).length;
  const pending = leaves.filter((l) => l.status === "pending" && ids.has(l.employeeId));
  const byId = Object.fromEntries(employees.map((e) => [e.id, e]));

  const decide = (l, status) => {
    db.patch("leaveRequests", l.id, { status, decidedBy: me?.id, decidedAt: TODAY });
    db.audit(me?.id, status === "approved" ? "Congé approuvé" : "Congé refusé", fullName(byId[l.employeeId]), `${date(l.from)} → ${date(l.to)} (${l.days} j)`);
    toast.success(`Demande de ${byId[l.employeeId].firstName} ${status === "approved" ? "approuvée" : "refusée"}.`, {
      action: { label: "Annuler", onClick: () => db.patch("leaveRequests", l.id, { status: "pending", decidedBy: null, decidedAt: null }) },
    });
  };

  if (!team.length) {
    return <EmptyState icon={Users} title="Aucun collaborateur dans votre équipe" description="Les membres dont vous êtes le responsable apparaîtront ici avec leur présence du jour." />;
  }

  return (
    <Stage>
      <Rise><Greeting user={user} description={`Votre équipe compte ${team.length} ${pluralFr(team.length, "personne")}.`} actions={<Button href="/app/inbox" icon={Inbox}>Approbations{pending.length ? ` (${pending.length})` : ""}</Button>} /></Rise>

      <Rise className="grid grid-cols-1 gap-[1em] sm:grid-cols-3">
        <KpiCard label="Présents aujourd'hui" icon={Users} value={<><CountUp value={count("present") + count("late") + count("remote") + count("mission")} /> <span className="text-h3 font-medium text-fg-muted">/ {team.length}</span></>} hint={`${count("late")} en retard`} />
        <KpiCard label="Absents ou en congé" icon={CalendarOff} value={countNode(count("leave") + count("absent"))} hint={`${count("leave")} en congé · ${count("absent")} absent`} />
        <KpiLink href="/app/inbox" label="À approuver" icon={Inbox} value={countNode(pending.length)} hint="demandes de congé" />
      </Rise>

      <div className="grid gap-[1.25em] lg:grid-cols-2">
        <Rise>
          <Card className="h-full">
            <CardHeader title="Équipe aujourd'hui" description={`${cap(todayLabel)}`} />
            <ul className="grid gap-[0.2em] sm:grid-cols-1">
              {team.map((e) => (
                <li key={e.id} className="flex items-center gap-[0.8em] rounded-md px-[0.4em] py-[0.45em] hover:bg-surface-hover">
                  <Avatar employee={e} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{fullName(e)}</span>
                    <span className="block text-xs text-fg-muted num">{today[e.id]?.in ? `Arrivée ${today[e.id].in}` : "—"}</span>
                  </span>
                  <StatusBadge status={statusOf(e)} map={ATTENDANCE_STATUS} />
                </li>
              ))}
            </ul>
          </Card>
        </Rise>
        <Rise>
          <Card className="h-full">
            <CardHeader title="Demandes à approuver" description="Décision en un clic, annulable juste après." />
            {pending.length ? (
              <ul>
                {pending.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-[0.8em] border-b border-border-subtle py-[0.8em] last:border-b-0">
                    <Avatar employee={byId[l.employeeId]} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{fullName(byId[l.employeeId])}</p>
                      <p className="text-xs text-fg-muted"><span aria-hidden className="me-[0.4em] inline-block size-[0.55em] rounded-full" style={{ background: LEAVE_TYPES[l.type]?.color }} />{LEAVE_TYPES[l.type]?.label} · {date(l.from)} → {date(l.to)} · {l.days} j</p>
                    </div>
                    <div className="flex gap-[0.4em]">
                      <Button size="sm" variant="secondary" onClick={() => decide(l, "rejected")}>Refuser</Button>
                      <Button size="sm" onClick={() => decide(l, "approved")}>Approuver</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Inbox} title="Aucune demande en attente" description="Vous êtes à jour. Les nouvelles demandes de votre équipe arriveront ici." className="!py-[1.5em]" />
            )}
          </Card>
        </Rise>
      </div>
      <Rise><LeaveStrip leaves={d.leaveRequests} employees={d.employees} scopeIds={ids} title="Calendrier de l'équipe" /></Rise>
      <Rise><EventsCard events={d.events.filter((e) => ids.has(e.employee.id))} title="Dans votre équipe" /></Rise>
    </Stage>
  );
}

/* ------------------------------------------------------------------ Employé */

function EmployeeView({ user }) {
  const me = user.employee;
  const runs = useCollection("payrollRuns");
  const leaves = useCollection("leaveRequests");
  const requests = useCollection("requests");
  const announcements = useCollection("announcements");
  const authors = useCollection("employees");
  if (!me) return <EmptyState icon={Users} title="Profil introuvable" description="Reconnectez-vous depuis le sélecteur de rôle." action={<Button href="/demo">Choisir un rôle</Button>} />;

  const lastRun = [...runs].sort((a, b) => b.period.localeCompare(a.period)).find((r) => r.lines.some((l) => l.employeeId === me.id));
  const line = lastRun?.lines.find((l) => l.employeeId === me.id);
  const myPending = [
    ...leaves.filter((l) => l.employeeId === me.id && l.status === "pending").map((l) => ({ id: l.id, title: `${LEAVE_TYPES[l.type]?.label} · ${l.days} j`, sub: `${date(l.from)} → ${date(l.to)}`, status: "pending", href: "/app/leave" })),
    ...requests.filter((r) => r.employeeId === me.id && r.status === "pending").map((r) => ({ id: r.id, title: { attestation_travail: "Attestation de travail", attestation_salaire: "Attestation de salaire", avance: "Avance sur salaire", changement_info: "Changement d'informations", materiel: "Demande de matériel", autre: "Autre demande" }[r.kind] ?? r.kind, sub: `Envoyée le ${date(r.createdAt)}`, status: "pending", href: "/app/requests" })),
  ];
  const news = [...announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date)).slice(0, 3);
  const holiday = HOLIDAYS.find((h) => h.date > TODAY);
  const balance = me.leaveBalance?.annual ?? 0;
  const taken = me.leaveBalance?.taken ?? 0;

  return (
    <Stage>
      <Rise><Greeting user={user} description="Vos congés, votre bulletin et vos demandes en un coup d'œil." actions={<Button href="/app/leave" icon={CalendarDays}>Poser un congé</Button>} /></Rise>
      <div className="grid gap-[1.25em] md:grid-cols-2">
        <Rise>
          <Card className="h-full">
            <CardHeader title="Solde de congés" description="Congé annuel" />
            <p className="font-display text-[3.5em] font-semibold leading-none tracking-[-0.03em] text-fg"><CountUp value={balance} /> <span className="text-h3 font-medium tracking-normal text-fg-muted">{pluralFr(balance, "jour")} restant{balance > 1 ? "s" : ""}</span></p>
            <Progress className="mt-[1em]" value={taken} max={balance + taken || 1} />
            <p className="mt-[0.5em] text-sm text-fg-muted num">{int(taken)} j pris cette année sur {int(balance + taken)} acquis</p>
            {holiday && <p className="mt-[1em] rounded-md bg-bg-sunken px-[0.8em] py-[0.6em] text-sm text-fg-secondary">Prochain jour férié : <strong className="font-medium text-fg">{holiday.label}</strong>, {dateLong(holiday.date)} (dans {diffDays(TODAY, holiday.date)} j).</p>}
          </Card>
        </Rise>
        <Rise>
          <Card className="h-full border-t-2 border-t-primary">
            <CardHeader title="Dernier bulletin" description={lastRun ? `Période ${periodLabel(lastRun.period)}` : undefined} />
            {line ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Net à payer</p>
                <p className="font-display text-kpi font-semibold text-fg num">{money(line.net)}</p>
                <dl className="mt-[0.8em] text-sm">
                  <div className="flex justify-between border-b border-border-subtle py-[0.4em]"><dt className="text-fg-muted">Salaire brut</dt><dd className="num">{money(line.gross)}</dd></div>
                  <div className="flex justify-between py-[0.4em]"><dt className="text-fg-muted">Retenues (CNAS + IRG)</dt><dd className="num text-fg-secondary">− {money(line.cnasEmployee + line.irg)}</dd></div>
                </dl>
                <Button href="/app/payslips" variant="secondary" icon={Receipt} className="mt-[0.6em]">Voir le bulletin</Button>
              </>
            ) : (
              <EmptyState icon={Receipt} title="Pas encore de bulletin" description="Votre premier bulletin apparaîtra après la prochaine paie." className="!py-[1em]" />
            )}
          </Card>
        </Rise>
        <Rise>
          <Card className="h-full">
            <CardHeader title="Mes demandes en cours" action={<Button href="/app/requests" variant="ghost" size="sm">Nouvelle demande</Button>} />
            {myPending.length ? (
              <ul>
                {myPending.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-[1em] border-b border-border-subtle py-[0.65em] last:border-b-0">
                    <span><span className="block text-sm font-medium text-fg">{r.title}</span><span className="text-xs text-fg-muted">{r.sub}</span></span>
                    <StatusBadge status={r.status} map={LEAVE_STATUS} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-muted">Aucune demande en attente.</p>
            )}
          </Card>
        </Rise>
        <Rise>
          <Card className="h-full">
            <CardHeader title="Annonces" action={<Button href="/app/announcements" variant="ghost" size="sm">Tout voir</Button>} />
            <ul>
              {news.map((a) => (
                <li key={a.id} className="border-b border-border-subtle py-[0.65em] last:border-b-0">
                  <p className="flex items-center gap-[0.5em] text-sm font-medium text-fg">{a.pinned && <Megaphone className="size-[1.05em] text-fg-muted" aria-label="Épinglée" />}{a.title}</p>
                  <p className="text-xs text-fg-muted">{date(a.date)} · {fullName(authors.find((x) => x.id === a.authorId))}</p>
                </li>
              ))}
            </ul>
          </Card>
        </Rise>
      </div>
    </Stage>
  );
}
