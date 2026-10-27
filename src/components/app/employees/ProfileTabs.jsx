"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarPlus, Check, Eye, EyeOff, FileText, History, Lock, Minus, ShieldCheck } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, ColumnChart, EmptyState, Progress, StatusBadge, toast } from "@/components/ui";
import { ATTENDANCE_STATUS, CONTRACT_TYPES, LEAVE_STATUS, LEAVE_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { db, useCollection, useDb } from "@/lib/db";
import { amount, date, dateLong, fullName, int, money, periodLabel } from "@/lib/format";
import { computePayslip } from "@/lib/payroll";
import { cn } from "@/lib/utils";
import InlineField from "./InlineField";
import { DefRow } from "./parts";
import { CDD_REASONS, EMP_STATUS, canEdit, completeness, frPhone, isEmail, seniority } from "./helpers";

const required = (v) => (String(v ?? "").trim() ? null : "Ce champ est obligatoire");
const digits = (n, label) => (v) => (new RegExp(`^\\d{${n}}$`).test(String(v).trim()) ? null : `${label} : ${n} chiffres attendus`);
const optionalDigits = (n, label) => (v) => (!String(v).trim() ? null : digits(n, label)(v));

function Grid({ children }) {
  return <div className="grid gap-[1.25em] lg:grid-cols-2">{children}</div>;
}

function useFieldFactory(emp, ctx) {
  const { editable, editingId, setEditingId, update } = ctx;
  return function field(key, label, o = {}) {
    const { sensitive, canSee = true, map, patch, get, show, display, ...rest } = o;
    const raw = get ? get(emp) : emp[key];
    return (
      <InlineField
        key={key}
        id={key}
        label={label}
        value={canSee ? (raw ?? "") : ""}
        display={!canSee ? "Réservé aux RH" : display}
        editable={editable && canSee}
        alwaysShow={ctx.editMode}
        editingId={editingId}
        setEditingId={setEditingId}
        onSave={(v) => {
          const next = map ? map(v) : v;
          update(label, patch ? patch(next) : { [key]: next }, show ? show(raw) : raw, show ? show(next) : next, { sensitive });
        }}
        {...rest}
      />
    );
  };
}

/* ---------------------------------------------------------------- Aperçu */

export function OverviewTab({ emp, ctx }) {
  const field = useFieldFactory(emp, ctx);
  const c = completeness(emp);
  const { canIds } = ctx;
  return (
    <div className="flex flex-col gap-[1.25em]">
      <Grid>
        <Card>
          <CardHeader title="Identité" description="État civil tel qu'il figure sur la pièce d'identité." />
          <dl>
            {field("firstName", "Prénom", { validate: required })}
            {field("lastName", "Nom", { validate: required })}
            {field("gender", "Genre", { options: [{ value: "M", label: "Homme" }, { value: "F", label: "Femme" }], display: emp.gender === "F" ? "Femme" : "Homme", show: (v) => (v === "F" ? "Femme" : "Homme") })}
            {field("birthDate", "Date de naissance", { type: "date", validate: required, display: emp.birthDate ? dateLong(emp.birthDate) : null, show: (v) => date(v) })}
            {field("birthPlace", "Lieu de naissance", { validate: required })}
            {field("maritalStatus", "Situation familiale", { options: ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"] })}
            {field("children", "Enfants à charge", { type: "number", validate: (v) => (Number(v) >= 0 && Number(v) <= 15 ? null : "Entre 0 et 15"), map: Number, display: String(emp.children ?? 0) })}
            {field("nin", "NIN", { mono: true, sensitive: true, canSee: canIds, validate: digits(18, "NIN"), suffix: undefined })}
          </dl>
        </Card>
        <Card>
          <CardHeader title="Coordonnées" description="Utilisées pour les notifications et les attestations." />
          <dl>
            {field("email", "Email professionnel", { type: "email", validate: (v) => (isEmail(v) ? null : "Adresse email invalide") })}
            {field("phone", "Téléphone", { validate: (v) => (frPhone(v) ? null : "Format attendu : 05 50 12 34 56") })}
            {field("address", "Adresse", { validate: required })}
          </dl>
          <div className="mt-[1.5em]">
            <CardHeader title="Affiliation & paiement" description="Nécessaires à la paie et aux déclarations CNAS." className="!mb-[0.4em]" />
            <dl>
              {field("cnasNumber", "N° CNAS", { mono: true, sensitive: true, canSee: canIds, validate: digits(12, "N° CNAS") })}
              {field("rib", "RIB / CCP", { mono: true, sensitive: true, canSee: canIds, validate: digits(20, "RIB") })}
            </dl>
          </div>
        </Card>
      </Grid>

      <Card>
        <CardHeader
          title="Complétude du dossier"
          description={c.missing.length ? `${c.missing.length} information${c.missing.length > 1 ? "s" : ""} à renseigner pour une paie sans anomalie.` : "Toutes les informations obligatoires sont renseignées."}
          action={<span className="font-display text-h2 font-semibold text-fg num">{c.pct} %</span>}
        />
        <Progress value={c.pct} tone={c.critical.length ? "warning" : "success"} />
        <ul className="mt-[1em] grid gap-[0.5em] sm:grid-cols-2 lg:grid-cols-5">
          {["cnasNumber", "nin", "rib", "phone", "address"].map((key) => {
            const missing = c.missing.find((m) => m.key === key);
            const label = { cnasNumber: "N° CNAS", nin: "NIN", rib: "RIB / CCP", phone: "Téléphone", address: "Adresse" }[key];
            return (
              <li key={key} className="flex items-center justify-between gap-[0.5em] rounded-md border border-border-subtle bg-surface-2 px-[0.8em] py-[0.6em] text-sm">
                <span className="flex items-center gap-[0.5em] text-fg-secondary">
                  {missing ? <Minus className="size-[1.1em] text-warning" aria-hidden /> : <Check className="size-[1.1em] text-success" aria-hidden />}
                  {label}
                  <span className="sr-only">{missing ? "manquant" : "renseigné"}</span>
                </span>
                {missing && ctx.editable && (
                  <Button variant="soft" size="sm" onClick={() => ctx.setEditingId(key)}>Renseigner</Button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Poste & contrat */

export function JobTab({ emp, ctx }) {
  const field = useFieldFactory(emp, ctx);
  const positions = useCollection("positions");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const employees = useCollection("employees");
  const pos = positions.find((p) => p.id === emp.positionId);
  const dep = departments.find((d) => d.id === emp.departmentId);
  const ent = entities.find((e) => e.id === emp.entityId);
  const manager = employees.find((e) => e.id === emp.managerId);
  const cdd = emp.contract?.type && emp.contract.type !== "CDI";
  const contractPatch = (p) => ({ contract: { ...emp.contract, ...p } });

  return (
    <Grid>
      <Card>
        <CardHeader title="Poste & rattachement" />
        <dl>
          {field("positionId", "Poste", {
            options: positions.map((p) => ({ value: p.id, label: `${p.title} — ${departments.find((d) => d.id === p.departmentId)?.name ?? ""}` })),
            display: pos?.title,
            patch: (id) => ({ positionId: id, departmentId: positions.find((p) => p.id === id)?.departmentId ?? emp.departmentId }),
            show: (id) => positions.find((p) => p.id === id)?.title ?? id,
          })}
          <DefRow label="Département">{dep?.name ?? "—"}</DefRow>
          {field("entityId", "Entité / site", { options: entities.map((e) => ({ value: e.id, label: e.name })), display: ent?.name, show: (id) => entities.find((e) => e.id === id)?.name ?? id })}
          {field("managerId", "Responsable", {
            options: [{ value: "", label: "Aucun (direction)" }, ...employees.filter((e) => e.status !== "sorti" && e.id !== emp.id).map((e) => ({ value: e.id, label: fullName(e) }))],
            display: manager ? fullName(manager) : "Aucun (direction)",
            map: (v) => v || null,
            show: (id) => (id ? fullName(employees.find((e) => e.id === id)) : "Aucun"),
          })}
          {field("hireDate", "Date d'embauche", { type: "date", validate: required, display: dateLong(emp.hireDate), show: (v) => date(v) })}
          <DefRow label="Ancienneté">{seniority(emp.hireDate)}</DefRow>
          <DefRow label="Statut"><StatusBadge status={emp.status} map={EMP_STATUS} /></DefRow>
          {emp.status === "sorti" && <DefRow label="Sortie">{date(emp.exitDate)}{emp.exitReason ? ` · ${emp.exitReason}` : ""}</DefRow>}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Contrat" description="Les changements de type de contrat sont tracés dans l'activité." />
        <dl>
          {field("contractType", "Type de contrat", {
            get: (e) => e.contract?.type,
            options: Object.entries(CONTRACT_TYPES).map(([value, label]) => ({ value, label })),
            display: CONTRACT_TYPES[emp.contract?.type] ?? emp.contract?.type,
            patch: (t) => contractPatch({ type: t, endDate: t === "CDI" ? null : emp.contract?.endDate ?? addDays(emp.hireDate, 365) }),
          })}
          <DefRow label="Début">{date(emp.contract?.startDate)}</DefRow>
          {cdd &&
            field("contractEnd", "Date de fin", {
              type: "date",
              get: (e) => e.contract?.endDate,
              display: emp.contract?.endDate ? dateLong(emp.contract.endDate) : null,
              validate: (v) => (!v ? "Obligatoire pour un contrat à durée déterminée" : v <= emp.contract.startDate ? "Doit être postérieure au début du contrat" : null),
              patch: (v) => contractPatch({ endDate: v }),
              show: (v) => date(v),
            })}
          {cdd && emp.contract?.type === "CDD" &&
            field("contractReason", "Motif du CDD", { get: (e) => e.contract?.reason, options: CDD_REASONS, patch: (v) => contractPatch({ reason: v }) })}
          {field("trialEnd", "Fin de période d'essai", {
            type: "date",
            get: (e) => e.contract?.trialEnd,
            display: emp.contract?.trialEnd ? dateLong(emp.contract.trialEnd) : null,
            patch: (v) => contractPatch({ trialEnd: v }),
            show: (v) => date(v),
          })}
        </dl>
        <ol className="mt-[1.25em] space-y-[0.9em] border-s border-border ps-[1.1em] text-sm">
          <li className="relative">
            <span aria-hidden className="absolute -start-[1.5em] top-[0.35em] size-[0.6em] rounded-full bg-primary" />
            <p className="font-medium text-fg">Contrat {emp.contract?.type} signé</p>
            <p className="text-fg-muted">{dateLong(emp.contract?.startDate)}</p>
          </li>
          {emp.contract?.trialEnd && (
            <li className="relative">
              <span aria-hidden className="absolute -start-[1.5em] top-[0.35em] size-[0.6em] rounded-full border-2 border-primary bg-surface" />
              <p className="font-medium text-fg">Fin de période d’essai</p>
              <p className="text-fg-muted">{dateLong(emp.contract.trialEnd)}{emp.contract.trialEnd > TODAY ? " · à venir" : ""}</p>
            </li>
          )}
          {emp.contract?.endDate && (
            <li className="relative">
              <span aria-hidden className="absolute -start-[1.5em] top-[0.35em] size-[0.6em] rounded-full border-2 border-border-strong bg-surface" />
              <p className="font-medium text-fg">Échéance du contrat</p>
              <p className="text-fg-muted">{dateLong(emp.contract.endDate)}{emp.contract.endDate < TODAY ? " · échu" : ""}</p>
            </li>
          )}
        </ol>
      </Card>
    </Grid>
  );
}

/* ---------------------------------------------------------------- Rémunération */

function Leader({ label, value, strong, muted, children }) {
  return (
    <li className="flex items-baseline gap-[0.6em] py-[0.35em]">
      <span className={cn("text-sm", strong ? "font-semibold text-fg" : muted ? "text-fg-muted" : "text-fg-secondary")}>{label}</span>
      <span aria-hidden className="mb-[0.25em] min-w-[1em] flex-1 border-b border-dotted border-border-strong" />
      <span className={cn("num whitespace-nowrap", strong ? "font-semibold text-fg" : muted ? "text-fg-secondary" : "text-fg")}>{children ?? value}</span>
    </li>
  );
}

export function PayTab({ emp, ctx }) {
  const field = useFieldFactory(emp, ctx);
  const settings = useDb((s) => s.settings);
  const runs = useCollection("payrollRuns");
  const loans = useCollection("loans");
  const { revealed, reveal, hide } = ctx;
  const params = settings.payroll;
  const loan = loans.find((l) => l.employeeId === emp.id && l.status === "active");

  const slip = useMemo(
    () => computePayslip({ baseSalary: emp.baseSalary, components: emp.components, loanDeduction: loan?.monthly ?? 0 }, params),
    [emp.baseSalary, emp.components, loan, params],
  );
  const history = useMemo(
    () =>
      runs
        .map((r) => ({ period: r.period, line: r.lines.find((l) => l.employeeId === emp.id) }))
        .filter((x) => x.line)
        .sort((a, b) => a.period.localeCompare(b.period))
        .slice(-6),
    [runs, emp.id],
  );

  if (!revealed) {
    return (
      <Card className="mx-auto max-w-[36em]">
        <div className="flex flex-col items-center gap-[1em] py-[1.5em] text-center">
          <span className="flex size-[3.5em] items-center justify-center rounded-full bg-primary-soft text-pine-600"><Lock className="size-[1.5em]" aria-hidden strokeWidth={1.6} /></span>
          <div>
            <p className="font-display text-kpi font-semibold tracking-[0.12em] text-fg-faint num" aria-label="Montant masqué">•••• •••,•• DA</p>
            <h3 className="mt-[0.6em] text-h3 font-semibold text-fg">Rémunération masquée</h3>
            <p className="mx-auto mt-[0.3em] max-w-[40ch] text-sm text-fg-secondary">
              Donnée sensible. {ctx.isSelf ? "Seul vous pouvez consulter votre rémunération." : "L'affichage est enregistré dans le journal d'audit avec votre nom et l'heure."}
            </p>
          </div>
          <Button icon={Eye} onClick={reveal}>Afficher</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title="Simulation du bulletin d'octobre 2026"
          description="Calculé avec les paramètres de paie en vigueur (CNAS, IRG)."
          action={<Button variant="ghost" size="sm" icon={EyeOff} onClick={hide}>Masquer</Button>}
        />
        <ul>
          <li className="py-[0.2em]">
            <dl>
              {field("baseSalary", "Salaire de base", {
                type: "number",
                suffix: "DA",
                emphasize: true,
                display: money(emp.baseSalary),
                map: Number,
                validate: (v) => (Number(v) >= params.snmg ? null : `Inférieur au SNMG (${money(params.snmg, { decimals: 0 })})`),
                show: (v) => money(Number(v), { decimals: 0 }),
              })}
            </dl>
          </li>
          {slip.components.map((c) => <Leader key={c.code} label={c.label} value={money(c.amount)} />)}
          <Leader label="Salaire brut" strong value={money(slip.gross)} />
          <Leader label={`Retenue CNAS (${(params.cnasEmployee * 100).toFixed(0)} %)`} muted value={`− ${money(slip.cnasEmployee)}`} />
          <Leader label="IRG (barème mensuel)" muted value={`− ${money(slip.irg)}`} />
          {slip.loanDeduction > 0 && <Leader label="Remboursement avance / prêt" muted value={`− ${money(slip.loanDeduction)}`} />}
        </ul>
        <div className="mt-[1em] flex items-baseline justify-between border-t-2 border-t-primary pt-[0.9em]">
          <span className="font-semibold text-fg">Net à payer</span>
          <span className="font-display text-h2 font-semibold text-fg num">{money(slip.net)}</span>
        </div>
        <details className="mt-[1em] text-sm text-fg-secondary">
          <summary className="cursor-pointer font-medium text-fg">Voir le détail du calcul</summary>
          <p className="mt-[0.6em] max-w-[62ch] text-pretty">
            CNAS = {(params.cnasEmployee * 100).toFixed(0)} % × {money(slip.cotisable)} (assiette cotisable). Base imposable = brut imposable − CNAS = {money(slip.taxable)}. L’IRG est calculé sur le barème mensuel
            arrondi à la dizaine, avec abattement de 40 % (min. 1 000 DA, max. 1 500 DA). Taux paramétrables, à confirmer avant usage en production.
          </p>
        </details>
      </Card>

      <div className="flex flex-col gap-[1.25em]">
        <Card>
          <CardHeader title="Coût employeur" description="Charges patronales incluses." />
          <ul>
            <Leader label="Salaire brut" value={money(slip.gross)} />
            <Leader label={`CNAS patronale (${(params.cnasEmployer * 100).toFixed(0)} %)`} value={money(slip.cnasEmployer)} />
            <Leader label="FNPOS" value={money(slip.fnpos)} />
            <Leader label="Coût total mensuel" strong value={money(slip.employerCost)} />
          </ul>
        </Card>
        <Card>
          <CardHeader title="Net payé, 6 derniers mois" description="D'après les bulletins validés." />
          {history.length ? (
            <ColumnChart data={history.map((h) => ({ label: periodLabel(h.period).slice(0, 3), value: Math.round(h.line.net) }))} format={(v) => `${Math.round(v / 1000)}k`} height={150} />
          ) : (
            <p className="text-sm text-fg-muted">Aucun bulletin émis pour le moment.</p>
          )}
        </Card>
        {loan && (
          <Card>
            <CardHeader title="Avance en cours" />
            <p className="text-sm text-fg-secondary">{loan.reason || "Avance sur salaire"} · mensualité {money(loan.monthly, { decimals: 0 })}</p>
            <Progress className="mt-[0.7em]" value={loan.total - loan.remaining} max={loan.total} />
            <p className="mt-[0.4em] text-xs text-fg-muted">Reste à rembourser : {money(loan.remaining, { decimals: 0 })} sur {money(loan.total, { decimals: 0 })}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Temps & congés */

const SQUARE = { success: "bg-success-bg text-success-fg", warning: "bg-warning-bg text-warning-fg", danger: "bg-danger-bg text-danger-fg", info: "bg-info-bg text-info-fg", brand: "bg-primary-soft text-link", plum: "bg-neutral-bg text-neutral-fg", neutral: "bg-neutral-bg text-neutral-fg" };
const LETTER = { present: "P", late: "R", absent: "A", remote: "T", mission: "M", leave: "C", holiday: "F", pending: "·" };

export function TimeTab({ emp }) {
  const attendance = useCollection("attendance");
  const leaves = useCollection("leaveRequests");
  const mine = useMemo(() => attendance.filter((a) => a.employeeId === emp.id).sort((a, b) => a.date.localeCompare(b.date)), [attendance, emp.id]);
  const myLeaves = useMemo(() => leaves.filter((l) => l.employeeId === emp.id).sort((a, b) => b.from.localeCompare(a.from)), [leaves, emp.id]);
  const counts = useMemo(() => mine.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {}), [mine]);
  const balance = emp.leaveBalance?.annual ?? 0;
  const taken = emp.leaveBalance?.taken ?? 0;

  return (
    <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="flex flex-col gap-[1.25em]">
        <Card>
          <CardHeader title="Solde de congé annuel" />
          <p className="font-display text-kpi font-semibold text-fg num">{int(balance)} <span className="text-h3 font-medium text-fg-muted">jours restants</span></p>
          <Progress className="mt-[0.9em]" value={taken} max={balance + taken || 1} />
          <p className="mt-[0.5em] text-sm text-fg-muted num">{int(taken)} j pris cette année · {int(balance + taken)} j acquis</p>
          <Button href="/app/leave" variant="secondary" size="sm" icon={CalendarPlus} className="mt-[1em]">Poser un congé</Button>
        </Card>
        <Card>
          <CardHeader title="Présence" description="Trois dernières semaines." />
          <dl className="grid grid-cols-2 gap-[0.6em] text-sm">
            {["present", "late", "absent", "leave"].map((k) => (
              <div key={k} className="rounded-md border border-border-subtle bg-surface-2 px-[0.8em] py-[0.6em]">
                <dt className="text-fg-muted">{ATTENDANCE_STATUS[k].label}{k === "present" ? "" : "s"}</dt>
                <dd className="font-display text-h2 font-semibold text-fg num">{counts[k] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="flex flex-col gap-[1.25em]">
        <Card>
          <CardHeader title="Pointage récent" description="P présent · R retard · A absent · C congé · T télétravail" />
          {mine.length ? (
            <ul className="flex flex-wrap gap-[0.35em]">
              {mine.map((a) => {
                const s = ATTENDANCE_STATUS[a.status] ?? ATTENDANCE_STATUS.pending;
                return (
                  <li key={a.id} title={`${date(a.date)} · ${s.label}${a.in ? ` · arrivée ${a.in}` : ""}`} className={cn("flex size-[2.1em] items-center justify-center rounded-md text-xs font-semibold", SQUARE[s.tone])}>
                    <span aria-hidden>{LETTER[a.status] ?? "·"}</span>
                    <span className="sr-only">{date(a.date)} : {s.label}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">Aucun pointage enregistré sur la période.</p>
          )}
        </Card>
        <Card padded={false}>
          <div className="p-[1.5em] pb-[0.5em]"><CardHeader title="Demandes de congé" className="!mb-0" /></div>
          {myLeaves.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="h-[2.4em] bg-bg-sunken text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
                    <th className="ps-[1.5em] text-start">Type</th>
                    <th className="px-[1em] text-start">Période</th>
                    <th className="px-[1em] text-end">Jours</th>
                    <th className="pe-[1.5em] ps-[1em] text-start">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map((l) => (
                    <tr key={l.id} className="h-[2.6em] border-t border-border-subtle">
                      <td className="ps-[1.5em]">
                        <span className="inline-flex items-center gap-[0.5em]"><span aria-hidden className="size-[0.6em] rounded-full" style={{ background: LEAVE_TYPES[l.type]?.color }} />{LEAVE_TYPES[l.type]?.label ?? l.type}</span>
                      </td>
                      <td className="px-[1em] text-fg-secondary num">{date(l.from)} → {date(l.to)}</td>
                      <td className="px-[1em] text-end num">{l.days}</td>
                      <td className="pe-[1.5em] ps-[1em]"><StatusBadge status={l.status} map={LEAVE_STATUS} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-[1.5em] pb-[1.5em] text-sm text-fg-muted">Aucune demande de congé pour ce salarié.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Documents */

export function DocumentsTab({ emp, ctx }) {
  const documents = useCollection("documents");
  const requests = useCollection("requests");
  const docs = useMemo(() => documents.filter((d) => d.ownerId === emp.id), [documents, emp.id]);
  const reqs = useMemo(() => requests.filter((r) => r.employeeId === emp.id), [requests, emp.id]);

  const checklist = [
    { label: "Pièce d'identité / NIN", ok: !!emp.nin },
    { label: "Carte d'affiliation CNAS", ok: !!emp.cnasNumber },
    { label: "RIB ou relevé CCP", ok: !!emp.rib },
    { label: "Contrat de travail signé", ok: !!emp.contract?.startDate },
    { label: "Certificat médical d'aptitude", ok: docs.some((d) => /m[ée]dical/i.test(d.name)) },
  ];
  const ask = (label) => {
    db.audit(ctx.actor?.id, "Pièce demandée au salarié", fullName(emp), label);
    toast.success(`Demande envoyée à ${emp.firstName} : ${label.toLowerCase()}.`);
  };

  return (
    <div className="grid gap-[1.25em] lg:grid-cols-2">
      <Card>
        <CardHeader title="Pièces du dossier" description={`${checklist.filter((c) => c.ok).length} sur ${checklist.length} pièces disponibles.`} />
        <ul>
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-[1em] border-b border-border-subtle py-[0.65em] last:border-b-0">
              <span className="flex items-center gap-[0.6em] text-sm text-fg">
                {c.ok ? <Check className="size-[1.1em] text-success" aria-hidden /> : <Minus className="size-[1.1em] text-warning" aria-hidden />}
                {c.label}
              </span>
              {c.ok ? <Badge tone="success">Reçu</Badge> : ctx.editable ? <Button size="sm" variant="soft" onClick={() => ask(c.label)}>Demander</Button> : <Badge tone="warning">Manquant</Badge>}
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex flex-col gap-[1.25em]">
        <Card>
          <CardHeader title="Documents archivés" />
          {docs.length ? (
            <ul>
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-[0.8em] border-b border-border-subtle py-[0.65em] last:border-b-0">
                  <FileText className="size-[1.3em] shrink-0 text-fg-muted" aria-hidden strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{d.name}</p>
                    <p className="text-xs text-fg-muted">{d.folder} · ajouté le {date(d.uploadedAt)}{d.expiresAt ? ` · expire le ${date(d.expiresAt)}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} title="Aucun document archivé" description="Les contrats, certificats et pièces téléversés apparaîtront ici." className="!py-[1.5em]" />
          )}
        </Card>
        <Card>
          <CardHeader title="Demandes du salarié" />
          {reqs.length ? (
            <ul className="text-sm">
              {reqs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-[1em] border-b border-border-subtle py-[0.6em] last:border-b-0">
                  <span className="text-fg">{{ attestation_travail: "Attestation de travail", attestation_salaire: "Attestation de salaire", avance: "Avance sur salaire", changement_info: "Changement d'informations", materiel: "Demande de matériel", autre: "Autre demande" }[r.kind] ?? r.kind}<span className="block text-xs text-fg-muted">{date(r.createdAt)}{r.note ? ` · ${r.note}` : ""}</span></span>
                  <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status === "approved" ? "Approuvée" : r.status === "rejected" ? "Refusée" : "En attente"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">Aucune demande en cours.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Activité / audit */

export function ActivityTab({ emp }) {
  const audit = useCollection("audit");
  const employees = useCollection("employees");
  const events = useMemo(() => {
    const name = fullName(emp);
    const byId = Object.fromEntries(employees.map((e) => [e.id, e]));
    const fromAudit = audit
      .filter((a) => a.target === name || a.actorId === emp.id)
      .map((a) => ({ id: a.id, at: a.at, title: a.action, detail: a.detail, by: byId[a.actorId], target: a.target === name ? null : a.target, kind: "audit" }));
    const synthetic = [
      { id: "hire", at: `${emp.hireDate}T08:00:00`, title: "Embauche", detail: `Contrat ${emp.contract?.type ?? ""}`, kind: "life" },
      ...(emp.contract?.trialEnd && emp.contract.trialEnd <= TODAY ? [{ id: "trial", at: `${emp.contract.trialEnd}T08:00:00`, title: "Fin de période d'essai", detail: "", kind: "life" }] : []),
      ...(emp.exitDate ? [{ id: "exit", at: `${emp.exitDate}T17:00:00`, title: "Sortie des effectifs", detail: emp.exitReason ?? "", kind: "life" }] : []),
    ];
    return [...fromAudit, ...synthetic].sort((a, b) => b.at.localeCompare(a.at));
  }, [audit, employees, emp]);

  return (
    <Card>
      <CardHeader title="Journal d'activité" description="Consultations sensibles, modifications et événements de carrière, du plus récent au plus ancien." />
      <ol className="space-y-[1em] border-s border-border ps-[1.25em]">
        {events.map((ev) => (
          <li key={ev.id} className="relative">
            <span aria-hidden className={cn("absolute -start-[1.7em] top-[0.4em] size-[0.65em] rounded-full", ev.kind === "audit" ? "bg-primary" : "border-2 border-border-strong bg-surface")} />
            <div className="flex flex-wrap items-baseline justify-between gap-[0.5em]">
              <p className="flex items-center gap-[0.5em] font-medium text-fg">
                {ev.kind === "audit" && <ShieldCheck className="size-[1.05em] text-fg-muted" aria-hidden />}
                {ev.kind === "life" && <History className="size-[1.05em] text-fg-muted" aria-hidden />}
                {ev.title}
              </p>
              <time className="text-xs text-fg-muted num">{date(ev.at)} · {ev.at.slice(11, 16)}</time>
            </div>
            {(ev.detail || ev.by) && (
              <p className="mt-[0.15em] flex flex-wrap items-center gap-[0.5em] text-sm text-fg-secondary">
                {ev.by && <span className="inline-flex items-center gap-[0.4em]"><Avatar employee={ev.by} size="xs" />{fullName(ev.by)}</span>}
                {ev.detail && <span>{ev.by ? "· " : ""}{ev.detail}</span>}
              </p>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export { canEdit };
