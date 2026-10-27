"use client";

import { useMemo, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Modal, PersonCell, SelectInput, TextArea, TextInput, toast } from "@/components/ui";
import { TODAY } from "@/lib/clock";
import { listDays } from "@/lib/dates";
import { db, newId, useCollection, useDb } from "@/lib/db";
import { amount, date, fullName } from "@/lib/format";
import { defaultParams } from "@/lib/payroll";
import { can } from "@/lib/session";
import { useCurrentUser } from "@/lib/use-current-user";
import { overtimeHours, fmtDec, isWorkday } from "./attendance-utils";

const KINDS = {
  standard: { label: "Jour ouvré", hint: "heures au-delà de 8 h" },
  night: { label: "Nuit (21 h – 5 h)", hint: "travail de nuit" },
  rest: { label: "Repos / jour férié", hint: "week-end ou jour férié travaillé" },
};
const LEGAL_CAP = "Plafond légal : 20 % de la durée légale du travail [à confirmer].";

export default function OvertimePanel({ period, employees }) {
  const me = useCurrentUser();
  const attendance = useCollection("attendance");
  const settings = useDb((s) => s.settings);
  const entries = useDb((s) => s.settings.overtimeEntries) ?? EMPTY;
  const params = settings.payroll ?? defaultParams;
  const showMoney = can(me.role, "salaries");
  const canEdit = ["admin", "hr", "manager"].includes(me.role);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ employeeId: "", date: TODAY, hours: "1", kind: "standard", reason: "" });
  const [touched, setTouched] = useState(false);

  const ids = useMemo(() => new Set(employees.map((e) => e.id)), [employees]);
  const monthEntries = useMemo(() => entries.filter((x) => x.date.startsWith(period) && ids.has(x.employeeId)), [entries, period, ids]);

  const rows = useMemo(() => {
    const days = listDays(`${period}-01`, `${period}-31`).filter((d) => d.startsWith(period) && d <= TODAY && isWorkday(d));
    return employees.map((e) => {
      const auto = attendance.filter((a) => a.employeeId === e.id && days.includes(a.date) && a.out && a.status !== "leave").reduce((s, a) => s + overtimeHours(a.in, a.out), 0);
      const manual = monthEntries.filter((x) => x.employeeId === e.id);
      const byKind = { standard: auto, night: 0, rest: 0 };
      manual.forEach((x) => { byKind[x.kind] += x.hours; });
      const hourly = e.baseSalary / params.hoursPerMonth;
      const weighted = Object.entries(byKind).reduce((s, [k, h]) => s + h * (1 + params.overtime[k]), 0);
      const total = auto + manual.reduce((s, x) => s + x.hours, 0);
      return { id: e.id, employee: e, auto, manualHours: total - auto, total, weighted, pay: hourly * weighted };
    }).filter((r) => r.total > 0);
  }, [employees, attendance, monthEntries, period, params]);

  const totals = rows.reduce((t, r) => ({ total: t.total + r.total, weighted: t.weighted + r.weighted, pay: t.pay + r.pay }), { total: 0, weighted: 0, pay: 0 });

  const submit = () => {
    setTouched(true);
    const h = parseFloat(form.hours.replace(",", "."));
    if (!form.employeeId || !(h > 0 && h <= 12) || !form.reason.trim() || !form.date) return;
    const entry = { id: newId("ot"), employeeId: form.employeeId, date: form.date, hours: h, kind: form.kind, reason: form.reason.trim(), by: me.employeeId };
    db.patchSettings({ overtimeEntries: [...entries, entry] });
    db.audit(me.employeeId, "Heures supplémentaires ajoutées", fullName(employees.find((e) => e.id === form.employeeId)), `${h} h · ${KINDS[form.kind].label} · ${date(form.date)}`);
    toast.success("Heures supplémentaires enregistrées");
    setModal(false);
    setTouched(false);
  };
  const remove = (x) => {
    db.patchSettings({ overtimeEntries: entries.filter((e) => e.id !== x.id) });
    toast.info("Entrée supprimée", { action: { label: "Annuler", onClick: () => db.patchSettings({ overtimeEntries: entries }) } });
  };
  const send = () => {
    db.audit(me.employeeId, "Heures sup. envoyées en paie", `Variables ${period}`, `${fmtDec(totals.total)} h, ${rows.length} salarié(s)`);
    toast.success("Heures supplémentaires transmises aux variables de paie");
  };

  const columns = [
    { key: "employee", header: "Salarié", sortValue: (r) => fullName(r.employee), cell: (r) => <PersonCell employee={r.employee} /> },
    { key: "auto", header: "Calculées (pointage)", align: "end", cell: (r) => `${fmtDec(r.auto, 2)} h` },
    { key: "manualHours", header: "Saisies", align: "end", cell: (r) => `${fmtDec(r.manualHours, 2)} h` },
    { key: "total", header: "Total", align: "end", cell: (r) => <strong className="font-semibold">{fmtDec(r.total, 2)} h</strong> },
    { key: "weighted", header: "Heures majorées", align: "end", cell: (r) => `${fmtDec(r.weighted, 2)} h` },
    ...(showMoney ? [{ key: "pay", header: "Montant brut", align: "end", cell: (r) => <>{amount(r.pay)} DA</> }] : []),
  ];

  return (
    <div className="flex flex-col gap-[1.25em]">
      <div className="grid gap-[1em] sm:grid-cols-3">
        {Object.entries(KINDS).map(([k, v]) => (
          <Card key={k} className="!p-[1.1em]">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">{v.label}</p>
            <p className="mt-[0.3em] font-display text-h2 font-semibold text-fg num">+{Math.round(params.overtime[k] * 100)} %</p>
            <p className="text-xs text-fg-muted">{v.hint}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-[0.75em]">
        <p className="text-sm text-fg-secondary">{rows.length} salarié{rows.length > 1 ? "s" : ""} · <strong className="font-semibold text-fg num">{fmtDec(totals.total, 2)} h</strong> au total. <span className="text-fg-muted">{LEGAL_CAP}</span></p>
        <div className="flex gap-[0.5em]">
          {canEdit && <Button variant="secondary" icon={Plus} onClick={() => { setForm((f) => ({ ...f, employeeId: employees.find((e) => e.id !== me.employeeId)?.id ?? employees[0]?.id ?? "" })); setModal(true); }}>Ajouter des heures</Button>}
          {(me.role === "admin" || me.role === "hr") && <Button icon={Send} disabled={!rows.length} onClick={send}>Envoyer en paie</Button>}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        pageSize={10}
        defaultSort={{ key: "total", dir: "desc" }}
        footerRow={rows.length ? { employee: "Total", total: `${fmtDec(totals.total, 2)} h`, weighted: `${fmtDec(totals.weighted, 2)} h`, ...(showMoney ? { pay: `${amount(totals.pay)} DA` } : {}) } : undefined}
        empty={<EmptyState title="Aucune heure supplémentaire ce mois" description="Les heures au-delà de 8 h par jour apparaissent ici automatiquement. Vous pouvez aussi en saisir à la main." />}
      />

      {monthEntries.length > 0 && (
        <Card>
          <CardHeader title="Saisies manuelles" description="Heures de nuit, repos ou jours fériés travaillés." />
          <ul className="flex flex-col divide-y divide-border-subtle">
            {monthEntries.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-[0.75em] py-[0.6em] text-sm first:pt-0 last:pb-0">
                <span className="min-w-[10em] flex-1 font-medium text-fg">{fullName(employees.find((e) => e.id === x.employeeId))}</span>
                <span className="num text-fg-secondary">{date(x.date)}</span>
                <Badge tone="info" dot={false}>{KINDS[x.kind].label}</Badge>
                <span className="num font-medium text-fg">{fmtDec(x.hours, 2)} h</span>
                <span className="min-w-0 flex-1 truncate text-fg-muted">{x.reason}</span>
                {canEdit && <Button size="icon" variant="ghost" aria-label="Supprimer cette saisie" onClick={() => remove(x)}><Trash2 className="size-[1.1em]" /></Button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} size="sm" title="Ajouter des heures supplémentaires" footer={<><Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></>}>
        <div className="flex flex-col gap-[1em]">
          <SelectInput label="Salarié" value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} options={employees.map((e) => ({ value: e.id, label: fullName(e) }))} />
          <div className="grid grid-cols-2 gap-[0.75em]">
            <TextInput label="Date" type="date" max={TODAY} value={form.date} onChange={(v) => setForm({ ...form, date: v })} error={touched && !form.date ? "Date requise." : undefined} />
            <TextInput label="Heures" inputMode="decimal" value={form.hours} suffix="h" onChange={(v) => setForm({ ...form, hours: v })} error={touched && !(parseFloat(form.hours.replace(",", ".")) > 0) ? "Saisissez un nombre d'heures." : undefined} />
          </div>
          <SelectInput label="Type (taux de majoration)" value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} options={Object.entries(KINDS).map(([value, k]) => ({ value, label: `${k.label} · +${Math.round(params.overtime[value] * 100)} %` }))} />
          <TextArea label="Motif" required rows={2} value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} error={touched && !form.reason.trim() ? "Précisez le motif." : undefined} />
        </div>
      </Modal>
    </div>
  );
}

const EMPTY = [];
