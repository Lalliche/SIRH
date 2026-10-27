"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, Button, EmptyState, PageHeader, toast } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { db, useCollection } from "@/lib/db";
import { money, periodLabel } from "@/lib/format";
import { defaultPayDate, preflightSummary, totalsOf } from "@/lib/payroll-run";
import { duration, ease } from "@/lib/motion-tokens";
import { draftId, draftOps, WIZARD_STEPS } from "../drafts";
import { useDrafts, usePayrollModel, usePayrollRuns } from "../hooks";
import { deMois } from "../utils";
import Stepper from "./Stepper";
import StepPeriod from "./StepPeriod";
import StepVariables from "./StepVariables";
import StepCalc from "./StepCalc";
import StepPreflight from "./StepPreflight";
import StepValidate from "./StepValidate";
import StepPay from "./StepPay";

const DESCRIPTIONS = {
  1: "Choisissez le mois, la date de paiement et les établissements concernés.",
  2: "Primes, heures supplémentaires, absences et retenues. Les valeurs issues des congés, du pointage et des prêts sont déjà remplies.",
  3: "Chaque bulletin est calculé avec le moteur de paie (CNAS, IRG, retenues).",
  4: "Les anomalies sont détectées avant la validation, et chaque écart avec le mois précédent est expliqué.",
  5: "Relisez les totaux. La validation verrouille la paie et génère les bulletins.",
  6: "Générez le fichier de virement, marquez la paie comme payée, puis préparez les déclarations.",
};

function Wizard({ user }) {
  const router = useRouter();
  const period = CURRENT_PERIOD;
  const id = draftId(period);
  const drafts = useDrafts();
  const runs = usePayrollRuns();
  const entities = useCollection("entities");
  const departments = useCollection("departments");
  const stored = drafts.find((d) => d.id === id);

  const baseDraft = useMemo(
    () => ({
      id, period, step: 1, maxStep: 1, calcDone: false, calcRuns: 0, runId: null, submitted: null,
      scope: { entityIds: entities.map((e) => e.id), departmentIds: departments.map((d) => d.id) },
      payDate: defaultPayDate(period), edits: {}, acks: {}, updatedAt: TODAY,
    }),
    [id, period, entities, departments],
  );
  const view = stored ?? baseDraft;
  const existing = runs.find((r) => r.period === period);
  const run = view.runId ? runs.find((r) => r.id === view.runId) : null;
  const step = run ? 6 : view.step;
  const isAdmin = user.role === "admin";
  const model = usePayrollModel({ period, scope: view.scope, edits: view.edits });
  const empById = model.empById;

  const update = useCallback(
    (patch) => (stored ? draftOps.patch(id, patch) : draftOps.save({ ...baseDraft, ...patch, updatedAt: TODAY })),
    [stored, id, baseDraft],
  );
  const goTo = (n) => update({ step: n, maxStep: Math.max(view.maxStep ?? 1, n) });
  const onCalcDone = useCallback(() => update({ calcDone: true }), [update]);
  const summary = preflightSummary(model.preflight.issues, view.acks);

  if (existing && !stored) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={`La paie ${deMois(period)} est déjà validée`}
        description="Consultez ses bulletins et ses totaux, ou passez aux déclarations."
        action={<Button href={`/app/payroll/runs/${existing.id}`}>Ouvrir la paie</Button>}
        secondary={<Button variant="ghost" href="/app/payroll">Retour à la paie</Button>}
      />
    );
  }

  const validate = () => {
    const lines = model.lines;
    const totals = totalsOf(lines);
    const newRun = {
      id: `run-${period}`, period, status: "validated", createdAt: TODAY, validatedAt: TODAY, validatedBy: user.employeeId,
      paidAt: null, declaredAt: null, payDate: view.payDate, bankFileAt: null, headcount: lines.length, lines, totals,
      scope: view.scope, acks: view.acks, source: "wizard",
    };
    db.insert("payrollRuns", newRun);
    draftOps.patch(id, { runId: newRun.id, step: 6, maxStep: 6 });
    db.audit(user.employeeId, "Paie validée", `Paie ${periodLabel(period)}`, `${lines.length} bulletins · net ${money(totals.net, { decimals: 0 })}${summary.ignored ? ` · ${summary.ignored} contrôle(s) ignoré(s) avec motif` : ""}`);
    db.notify({ title: `Paie ${deMois(period)} validée`, body: `${lines.length} bulletins · net ${money(totals.net, { decimals: 0 })}`, href: `/app/payroll/runs/${newRun.id}`, roles: ["admin", "hr", "accountant"] });
    toast.success(`Paie ${deMois(period)} validée : ${lines.length} bulletins générés.`);
  };
  const submit = () => {
    update({ submitted: { by: user.employeeId, at: TODAY } });
    db.audit(user.employeeId, "Paie soumise à validation", `Paie ${periodLabel(period)}`, `${model.lines.length} bulletins`);
    db.notify({ title: `Paie ${deMois(period)} à valider`, body: `${model.lines.length} bulletins · net ${money(model.totals.net, { decimals: 0 })}`, href: "/app/payroll/runs/new", roles: ["admin"] });
    toast.success("Paie soumise à la validation du directeur général.");
  };
  const bankFile = () => {
    db.patch("payrollRuns", run.id, { bankFileAt: TODAY });
    db.audit(user.employeeId, "Fichier de virement généré", `Paie ${periodLabel(period)}`, "Format démo");
    toast.success("Fichier de virement généré et téléchargé.");
  };
  const paid = () => {
    db.patch("payrollRuns", run.id, { status: "paid", paidAt: TODAY });
    db.audit(user.employeeId, "Paie marquée payée", `Paie ${periodLabel(period)}`, `${run.headcount} virements`);
    db.notify({ title: `Votre bulletin ${deMois(period)} est disponible`, body: "Consultez-le dans Mes bulletins.", href: "/app/payslips" });
    toast.success("Paie marquée comme payée. Les salariés ont été notifiés.");
  };
  const finish = () => {
    draftOps.remove(id);
    router.push(`/app/payroll/runs/${run.id}`);
  };

  const nextBlocked =
    (step === 1 && model.lines.length === 0) || (step === 3 && !view.calcDone) || (step === 4 && summary.blockers > 0);
  const reachable = (n) => (run ? n === 6 : n <= (view.maxStep ?? 1));
  const meta = WIZARD_STEPS[step - 1];

  return (
    <>
      <Button variant="ghost" size="sm" icon={ArrowLeft} href="/app/payroll" className="mb-[0.8em] -ms-[0.5em]">Paie</Button>
      <PageHeader
        eyebrow={`Étape ${step} sur 6`}
        title={`Paie ${deMois(period)}`}
        description={DESCRIPTIONS[step]}
        actions={<Badge tone="success" icon={CheckCircle2}>{stored ? "Brouillon enregistré" : "Pas encore enregistré"}</Badge>}
      />
      <div className="mb-[1.75em] rounded-lg border border-border bg-surface px-[1em] pb-[0.9em] pt-[1em] shadow-sm sm:px-[2em]">
        <Stepper step={step} reachable={reachable} onSelect={goTo} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={step}
          aria-label={meta.long}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.base, ease: ease.out }}
        >
          <h2 className="mb-[1em] text-h2 font-semibold text-fg">{meta.long}</h2>
          {step === 1 && <StepPeriod view={view} update={update} model={model} />}
          {step === 2 && <StepVariables view={view} update={update} model={model} />}
          {step === 3 && <StepCalc key={view.calcRuns ?? 0} model={model} calcDone={view.calcDone} onDone={onCalcDone} onRerun={() => update({ calcDone: false, calcRuns: (view.calcRuns ?? 0) + 1 })} />}
          {step === 4 && <StepPreflight view={view} update={update} model={model} user={user} />}
          {step === 5 && <StepValidate view={view} model={model} user={user} isAdmin={isAdmin} onValidate={validate} onSubmit={submit} />}
          {step === 6 && run && <StepPay run={run} empById={empById} onBankFile={bankFile} onPaid={paid} onFinish={finish} canPay />}
        </motion.section>
      </AnimatePresence>

      {step < 6 && (
        <div className="sticky bottom-0 -mx-[0.5em] mt-[1.75em] flex items-center justify-between gap-[1em] border-t border-border bg-bg/90 px-[0.5em] py-[0.9em] backdrop-blur">
          <Button variant="ghost" icon={ArrowLeft} disabled={step === 1} onClick={() => goTo(step - 1)}>Retour</Button>
          <div className="flex items-center gap-[0.8em]">
            {step === 4 && summary.blockers > 0 && <span className="hidden text-sm text-danger-fg sm:inline">{summary.blockers} point{summary.blockers > 1 ? "s" : ""} bloquant{summary.blockers > 1 ? "s" : ""}</span>}
            {step < 5 && <Button iconEnd={ArrowRight} disabled={nextBlocked} onClick={() => goTo(step + 1)}>{step === 4 ? "Passer à la validation" : "Continuer"}</Button>}
          </div>
        </div>
      )}
    </>
  );
}

export default function RunWizard() {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{(user) => <Wizard user={user} />}</AccessGate>;
}
