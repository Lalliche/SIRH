"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Pencil } from "lucide-react";
import { Badge, Button, Card, CardHeader, Checkbox, PageHeader, Segmented, SelectInput, TextInput, toast } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { CDD_REASONS, completeness, frPhone, isEmail, nextEmployeeId, nextMatricule, onlyDigits } from "./helpers";
import { CONTRACT_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { addDays, diffDays } from "@/lib/dates";
import { db, newId, useCollection, useDb } from "@/lib/db";
import { date, dateLong, fullName, money } from "@/lib/format";
import { duration, ease } from "@/lib/motion-tokens";
import { computePayslip } from "@/lib/payroll";
import { cn } from "@/lib/utils";

const STEPS = ["Identité", "Poste & contrat", "Rémunération", "Récapitulatif"];
const TINTS = ["#0e6560", "#3b7bc4", "#a9558f", "#7a8b2e", "#c98a0b", "#6f7f8c", "#d2643a", "#b9a57c"];

const INITIAL = {
  firstName: "", lastName: "", gender: "M", birthDate: "", birthPlace: "", nin: "", maritalStatus: "Célibataire", children: "0",
  phone: "", email: "", address: "",
  departmentId: "", positionId: "", entityId: "", managerId: "", hireDate: "2026-11-01",
  contractType: "CDI", endDate: "", reason: "", weeklyHours: "20", trialDays: "90",
  baseSalary: "", cnasNumber: "", rib: "",
};
const COMPONENTS = [
  { code: "panier", label: "Indemnité de panier", amount: 4000, on: true },
  { code: "transport", label: "Indemnité de transport", amount: 3000, on: false },
  { code: "rendement", label: "Prime de rendement", amount: 8000, on: false },
];
const TERM_TYPES = ["CDD", "ANEM", "STAGE"];

const STEP_FIELDS = [
  ["firstName", "lastName", "birthDate", "birthPlace", "nin", "children", "phone", "email", "address"],
  ["departmentId", "positionId", "entityId", "hireDate", "endDate", "reason", "weeklyHours"],
  ["baseSalary", "cnasNumber", "rib"],
  [],
];

function validate(f, ctx) {
  const e = {};
  const req = (k, msg = "Ce champ est obligatoire") => { if (!String(f[k]).trim()) e[k] = msg; };
  ["firstName", "lastName", "birthPlace", "address"].forEach((k) => req(k));
  if (f.firstName.trim() && f.firstName.trim().length < 2) e.firstName = "Au moins 2 caractères";
  req("birthDate");
  if (f.birthDate && diffDays(f.birthDate, TODAY) < 16 * 365) e.birthDate = "Âge minimum légal : 16 ans";
  if (f.nin && !/^\d{18}$/.test(f.nin)) e.nin = `18 chiffres attendus (${f.nin.length} saisis)`;
  else if (f.nin && ctx.employees.some((x) => x.nin === f.nin)) e.nin = `Ce NIN existe déjà (${fullName(ctx.employees.find((x) => x.nin === f.nin))})`;
  if (!(Number(f.children) >= 0 && Number(f.children) <= 15)) e.children = "Entre 0 et 15";
  if (!frPhone(f.phone)) e.phone = "Format attendu : 05 50 12 34 56";
  if (!isEmail(f.email)) e.email = "Adresse email invalide";
  else if (ctx.employees.some((x) => x.email === f.email.trim().toLowerCase())) e.email = "Cette adresse est déjà utilisée";
  req("departmentId", "Choisissez un département");
  req("positionId", "Choisissez un poste");
  req("entityId", "Choisissez une entité");
  req("hireDate");
  if (TERM_TYPES.includes(f.contractType)) {
    if (!f.endDate) e.endDate = "Date de fin obligatoire pour ce type de contrat";
    else if (f.hireDate && f.endDate <= f.hireDate) e.endDate = "Doit être postérieure à la date d'embauche";
  }
  if (f.contractType === "CDD" && !f.reason) e.reason = "Le motif est obligatoire pour un CDD";
  if (f.contractType === "TEMPS_PARTIEL" && !(Number(f.weeklyHours) > 0 && Number(f.weeklyHours) < 40)) e.weeklyHours = "Entre 1 et 39 h";
  if (!f.baseSalary) e.baseSalary = "Salaire de base obligatoire";
  else if (Number(f.baseSalary) < ctx.snmg) e.baseSalary = `Inférieur au SNMG (${money(ctx.snmg, { decimals: 0 })})`;
  if (f.cnasNumber && !/^\d{12}$/.test(f.cnasNumber)) e.cnasNumber = "12 chiffres attendus";
  else if (f.cnasNumber && ctx.employees.some((x) => x.cnasNumber === f.cnasNumber)) e.cnasNumber = "Ce numéro CNAS existe déjà";
  if (f.rib && !/^\d{20}$/.test(f.rib)) e.rib = "20 chiffres attendus";
  return e;
}

export default function EmployeeWizard() {
  return <AccessGate roles={["admin", "hr"]}>{(user) => <Wizard user={user} />}</AccessGate>;
}

function Wizard({ user }) {
  const router = useRouter();
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const positions = useCollection("positions");
  const entities = useCollection("entities");
  const params = useDb((s) => s.settings.payroll);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [comps, setComps] = useState(COMPONENTS);
  const [touched, setTouched] = useState({});
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => validate(form, { employees, snmg: params.snmg }), [form, employees, params.snmg]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k) => () => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const bind = (k) => ({ value: form[k], onChange: set(k), onBlur: touch(k), error: touched[k] ? errors[k] : undefined });

  const termType = TERM_TYPES.includes(form.contractType);
  const positionOptions = positions.filter((p) => p.departmentId === form.departmentId);
  const dep = departments.find((d) => d.id === form.departmentId);
  const median = useMemo(() => {
    const list = employees.filter((e) => e.positionId === form.positionId && e.status !== "sorti").map((e) => e.baseSalary).sort((a, b) => a - b);
    return list.length ? list[Math.floor(list.length / 2)] : null;
  }, [employees, form.positionId]);

  const activeComps = comps.filter((c) => c.on).map((c) => ({ code: c.code, label: c.label, amount: Number(c.amount) || 0, cotisable: true, imposable: true }));
  const slip = useMemo(
    () => (Number(form.baseSalary) > 0 ? computePayslip({ baseSalary: Number(form.baseSalary), components: activeComps }, params) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.baseSalary, comps, params],
  );

  const stepHasErrors = (s) => STEP_FIELDS[s].some((k) => errors[k]);
  const go = (to) => { setDirection(to > step ? 1 : -1); setStep(to); window.scrollTo?.({ top: 0 }); };
  const next = () => {
    if (stepHasErrors(step)) {
      setTouched((t) => ({ ...t, ...Object.fromEntries(STEP_FIELDS[step].map((k) => [k, true])) }));
      const first = STEP_FIELDS[step].find((k) => errors[k]);
      document.querySelector(`[name="${first}"]`)?.focus?.();
      return;
    }
    go(step + 1);
  };

  const onDepartment = (id) => {
    setForm((f) => ({ ...f, departmentId: id, positionId: "", managerId: departments.find((d) => d.id === id)?.headId ?? "" }));
  };
  const onContract = (t) => {
    setForm((f) => ({ ...f, contractType: t, endDate: TERM_TYPES.includes(t) ? f.endDate || addDays(f.hireDate, 180) : "", trialDays: t === "STAGE" ? "0" : t === "CDI" ? "90" : "30" }));
  };

  const preview = useMemo(() => {
    const trialEnd = Number(form.trialDays) > 0 && form.hireDate ? addDays(form.hireDate, Number(form.trialDays)) : null;
    return { ...form, trialEnd, nin: form.nin, cnasNumber: form.cnasNumber, rib: form.rib };
  }, [form]);
  const comp = completeness({ ...preview });

  const create = () => {
    const all = validate(form, { employees, snmg: params.snmg });
    const bad = STEP_FIELDS.findIndex((_, i) => STEP_FIELDS[i].some((k) => all[k]));
    if (bad >= 0) {
      setTouched((t) => ({ ...t, ...Object.fromEntries(STEP_FIELDS.flat().map((k) => [k, true])) }));
      toast.error("Certains champs sont à corriger avant la création.");
      return go(bad);
    }
    setSaving(true);
    const id = nextEmployeeId(employees);
    const hire = form.hireDate;
    const months = Math.max(0, Math.floor(diffDays(hire, TODAY) / 30.4));
    const trialEnd = preview.trialEnd;
    const employee = {
      id,
      matricule: nextMatricule(employees),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthPlace: form.birthPlace.trim(),
      maritalStatus: form.maritalStatus,
      children: Number(form.children),
      nin: form.nin,
      cnasNumber: form.cnasNumber,
      rib: form.rib,
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
      departmentId: form.departmentId,
      positionId: form.positionId,
      entityId: form.entityId,
      managerId: form.managerId || null,
      role: "employee",
      status: trialEnd && trialEnd >= TODAY ? "essai" : "actif",
      hireDate: hire,
      contract: {
        type: form.contractType,
        startDate: hire,
        endDate: termType ? form.endDate : null,
        trialEnd,
        ...(form.contractType === "CDD" ? { reason: form.reason } : {}),
        ...(form.contractType === "TEMPS_PARTIEL" ? { weeklyHours: Number(form.weeklyHours) } : {}),
      },
      baseSalary: Number(form.baseSalary),
      components: activeComps,
      tint: TINTS[employees.length % TINTS.length],
      leaveBalance: { annual: hire > TODAY ? 0 : Math.round(months * 2.5), taken: 0 },
    };
    db.insert("employees", employee);
    db.audit(user.employee?.id, "Employé créé", fullName(employee), `${employee.matricule} · ${CONTRACT_TYPES[form.contractType]} · embauche ${date(hire)}`);
    if (comp.missing.length) {
      db.notify({ title: `Dossier incomplet : ${fullName(employee)}`, body: `Manque : ${comp.missing.map((m) => m.label).join(", ")}.`, href: `/app/employees/${id}`, roles: ["admin", "hr"] });
    }
    toast.success(`${fullName(employee)} a été ajouté(e) aux effectifs.`);
    router.push(`/app/employees/${id}`);
  };

  return (
    <div>
      <Button href="/app/employees" variant="ghost" size="sm" icon={ArrowLeft} className="-ms-[0.5em] mb-[0.75em]">Employés</Button>
      <PageHeader title="Ajouter un employé" description="Quatre étapes, validation au fil de la saisie. Vous pourrez compléter les pièces manquantes plus tard." />

      <ol className="mb-[1.5em] grid grid-cols-2 gap-[0.6em] sm:grid-cols-4" aria-label="Progression">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <Button
                variant="ghost"
                disabled={i > step}
                onClick={() => go(i)}
                className={cn("!h-auto w-full justify-start !gap-[0.7em] !rounded-lg border !px-[0.9em] !py-[0.7em]", current ? "border-primary bg-surface" : "border-border bg-surface-2")}
              >
                <span className={cn("flex size-[1.8em] shrink-0 items-center justify-center rounded-full text-xs font-semibold", done ? "bg-primary text-primary-fg" : current ? "border-2 border-primary text-fg" : "border border-border-strong text-fg-muted")}>
                  {done ? <Check className="size-[1.1em]" aria-hidden /> : i + 1}
                </span>
                <span className={cn("truncate text-sm", current ? "font-semibold text-fg" : "text-fg-secondary")}>{label}</span>
                <span className="sr-only">{done ? "(terminée)" : current ? "(en cours)" : "(à venir)"}</span>
              </Button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,1fr)_20em]">
        <div>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction * 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -16 }}
              transition={{ duration: duration.base, ease: ease.out }}
            >
              {step === 0 && (
                <Card>
                  <CardHeader title="Identité" description="Telle qu'elle figure sur la pièce d'identité nationale." />
                  <div className="grid gap-[1em] sm:grid-cols-2">
                    <TextInput label="Prénom" required name="firstName" autoComplete="off" {...bind("firstName")} />
                    <TextInput label="Nom" required name="lastName" autoComplete="off" {...bind("lastName")} />
                    <div className="flex flex-col gap-[0.4em]">
                      <span className="text-[0.8125em] font-medium text-fg-secondary">Genre <span className="font-normal text-fg-muted">(obligatoire)</span></span>
                      <Segmented value={form.gender} onChange={set("gender")} options={[{ value: "M", label: "Homme" }, { value: "F", label: "Femme" }]} className="self-start" />
                    </div>
                    <TextInput label="Date de naissance" required type="date" name="birthDate" {...bind("birthDate")} />
                    <TextInput label="Lieu de naissance" required name="birthPlace" {...bind("birthPlace")} />
                    <SelectInput label="Situation familiale" value={form.maritalStatus} onChange={set("maritalStatus")} options={["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"]} />
                    <TextInput
                      label="NIN (numéro d'identification nationale)"
                      name="nin"
                      inputMode="numeric"
                      placeholder="18 chiffres"
                      hint={`${form.nin.length}/18 chiffres · facultatif maintenant, requis pour la déclaration CNAS`}
                      className="sm:col-span-2 [&_input]:font-mono"
                      value={form.nin}
                      onChange={(v) => set("nin")(onlyDigits(v, 18))}
                      onBlur={touch("nin")}
                      error={touched.nin ? errors.nin : undefined}
                    />
                    <TextInput label="Enfants à charge" type="number" min={0} name="children" {...bind("children")} />
                    <TextInput label="Téléphone mobile" required name="phone" inputMode="tel" placeholder="05 50 12 34 56" {...bind("phone")} />
                    <TextInput label="Email" required type="email" name="email" className="sm:col-span-2" placeholder="prenom.nom@tassili-industries.dz" {...bind("email")} />
                    <TextInput label="Adresse" required name="address" className="sm:col-span-2" {...bind("address")} />
                  </div>
                </Card>
              )}

              {step === 1 && (
                <Card>
                  <CardHeader title="Poste & contrat" description="Les champs affichés s'adaptent au type de contrat." />
                  <div className="grid gap-[1em] sm:grid-cols-2">
                    <SelectInput label="Département" required name="departmentId" placeholder="Choisir" options={departments.map((d) => ({ value: d.id, label: d.name }))} value={form.departmentId} onChange={onDepartment} onBlur={touch("departmentId")} error={touched.departmentId ? errors.departmentId : undefined} />
                    <SelectInput label="Poste" required name="positionId" placeholder={form.departmentId ? "Choisir" : "Choisir d'abord un département"} disabled={!form.departmentId} options={positionOptions.map((p) => ({ value: p.id, label: p.title }))} {...bind("positionId")} />
                    <SelectInput label="Entité / site" required name="entityId" placeholder="Choisir" options={entities.map((x) => ({ value: x.id, label: x.name }))} {...bind("entityId")} />
                    <SelectInput
                      label="Responsable hiérarchique"
                      value={form.managerId}
                      onChange={set("managerId")}
                      placeholder="Aucun"
                      options={employees.filter((e) => e.status !== "sorti").map((e) => ({ value: e.id, label: fullName(e) }))}
                      hint={dep?.headId ? "Pré-rempli avec le responsable du département." : undefined}
                    />
                    <TextInput label="Date d'embauche" required type="date" name="hireDate" {...bind("hireDate")} />
                    <SelectInput label="Type de contrat" required value={form.contractType} onChange={onContract} options={Object.entries(CONTRACT_TYPES).map(([value, label]) => ({ value, label }))} />
                    {termType && <TextInput label="Date de fin du contrat" required type="date" name="endDate" {...bind("endDate")} />}
                    {form.contractType === "CDD" && <SelectInput label="Motif du CDD" required name="reason" placeholder="Choisir" options={CDD_REASONS} {...bind("reason")} />}
                    {form.contractType === "TEMPS_PARTIEL" && <TextInput label="Heures par semaine" required type="number" name="weeklyHours" suffix="h" {...bind("weeklyHours")} />}
                    <SelectInput
                      label="Période d'essai"
                      value={form.trialDays}
                      onChange={set("trialDays")}
                      options={[{ value: "0", label: "Aucune" }, { value: "15", label: "15 jours" }, { value: "30", label: "30 jours" }, { value: "90", label: "3 mois (90 jours)" }, { value: "180", label: "6 mois (cadres)" }]}
                      hint={preview.trialEnd ? `Se termine le ${dateLong(preview.trialEnd)}` : undefined}
                    />
                  </div>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader title="Rémunération" description="Le bulletin à droite se recalcule à chaque modification." />
                  <div className="grid gap-[1em] sm:grid-cols-2">
                    <TextInput
                      label="Salaire de base mensuel"
                      required
                      type="number"
                      name="baseSalary"
                      suffix="DA"
                      min={0}
                      hint={median ? `Médiane actuelle du poste : ${money(median, { decimals: 0 })}` : `SNMG : ${money(params.snmg, { decimals: 0 })}`}
                      {...bind("baseSalary")}
                    />
                    <div className="flex items-end">
                      {median && <Button variant="soft" onClick={() => { set("baseSalary")(String(median)); touch("baseSalary")(); }}>Utiliser {money(median, { decimals: 0 })}</Button>}
                    </div>
                  </div>
                  <fieldset className="mt-[1.25em]">
                    <legend className="mb-[0.5em] text-[0.8125em] font-medium text-fg-secondary">Indemnités et primes</legend>
                    <ul className="divide-y divide-border-subtle rounded-lg border border-border">
                      {comps.map((c, i) => (
                        <li key={c.code} className="flex items-center justify-between gap-[1em] px-[1em] py-[0.7em]">
                          <Checkbox checked={c.on} onChange={(on) => setComps((l) => l.map((x, j) => (j === i ? { ...x, on } : x)))} label={c.label} />
                          <TextInput
                            aria-label={`Montant ${c.label}`}
                            type="number"
                            suffix="DA"
                            disabled={!c.on}
                            value={c.amount}
                            onChange={(v) => setComps((l) => l.map((x, j) => (j === i ? { ...x, amount: v } : x)))}
                            className="w-[10em] [&_input]:h-[2.25em]"
                          />
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                  <div className="mt-[1.25em] grid gap-[1em] sm:grid-cols-2">
                    <TextInput
                      label="N° CNAS"
                      name="cnasNumber"
                      inputMode="numeric"
                      placeholder="12 chiffres"
                      hint={`${form.cnasNumber.length}/12 · facultatif maintenant`}
                      className="[&_input]:font-mono"
                      value={form.cnasNumber}
                      onChange={(v) => set("cnasNumber")(onlyDigits(v, 12))}
                      onBlur={touch("cnasNumber")}
                      error={touched.cnasNumber ? errors.cnasNumber : undefined}
                    />
                    <TextInput
                      label="RIB / CCP"
                      name="rib"
                      inputMode="numeric"
                      placeholder="20 chiffres"
                      hint={`${form.rib.length}/20 · facultatif maintenant`}
                      className="[&_input]:font-mono"
                      value={form.rib}
                      onChange={(v) => set("rib")(onlyDigits(v, 20))}
                      onBlur={touch("rib")}
                      error={touched.rib ? errors.rib : undefined}
                    />
                  </div>
                </Card>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-[1.25em]">
                  <Card>
                    <CardHeader title="Vérifiez avant de créer" description="Cliquez sur « Modifier » pour revenir à une section." />
                    <Recap
                      sections={[
                        { title: "Identité", step: 0, rows: [["Nom complet", `${form.firstName} ${form.lastName}`], ["Naissance", `${form.birthDate ? dateLong(form.birthDate) : "—"} à ${form.birthPlace}`], ["NIN", form.nin || null], ["Contact", `${form.phone} · ${form.email}`], ["Adresse", form.address]] },
                        { title: "Poste & contrat", step: 1, rows: [["Poste", positions.find((p) => p.id === form.positionId)?.title], ["Département", dep?.name], ["Entité", entities.find((x) => x.id === form.entityId)?.name], ["Responsable", form.managerId ? fullName(employees.find((e) => e.id === form.managerId)) : "Aucun"], ["Contrat", `${CONTRACT_TYPES[form.contractType]} depuis le ${date(form.hireDate)}${termType ? ` jusqu'au ${date(form.endDate)}` : ""}`], ...(form.contractType === "CDD" ? [["Motif", form.reason]] : []), ["Fin de période d'essai", preview.trialEnd ? date(preview.trialEnd) : "Aucune"]] },
                        { title: "Rémunération", step: 2, rows: [["Salaire de base", money(Number(form.baseSalary))], ["Éléments", activeComps.map((c) => c.label).join(", ") || "Aucun"], ["N° CNAS", form.cnasNumber || null], ["RIB / CCP", form.rib || null]] },
                      ]}
                      onEdit={go}
                    />
                  </Card>
                  <Card className={cn(comp.missing.length ? "border-warning/50" : "")}>
                    <div className="flex items-start gap-[0.8em]">
                      {comp.missing.length ? <CircleAlert className="mt-[0.15em] size-[1.3em] text-warning" aria-hidden /> : <Check className="mt-[0.15em] size-[1.3em] text-success" aria-hidden />}
                      <div>
                        <p className="font-medium text-fg">Dossier complet à {comp.pct} %</p>
                        <p className="text-sm text-fg-secondary">
                          {comp.missing.length ? `Manque : ${comp.missing.map((m) => m.label).join(", ")}. Le dossier sera marqué « incomplet » et un rappel sera créé pour l'équipe RH.` : "Toutes les informations obligatoires à la paie sont présentes."}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-[1.25em] flex items-center justify-between gap-[0.6em]">
            {step > 0 ? <Button variant="ghost" icon={ArrowLeft} onClick={() => go(step - 1)}>Retour</Button> : <Button variant="ghost" href="/app/employees">Annuler</Button>}
            {step < 3 ? <Button iconEnd={ArrowRight} onClick={next}>Continuer</Button> : <Button icon={Check} loading={saving} onClick={create}>Créer l’employé</Button>}
          </div>
        </div>

        <aside aria-label="Aperçu du bulletin" className="lg:sticky lg:top-[1em] lg:self-start">
          <Card className="border-t-2 border-t-primary">
            <h3 className="text-h3 font-semibold text-fg">Aperçu du bulletin</h3>
            <p className="mb-[0.8em] text-sm text-fg-muted">Brut → net, mois complet</p>
            {slip ? (
              <dl className="text-sm">
                {[["Salaire brut", slip.gross], ["CNAS salariale", -slip.cnasEmployee], ["IRG", -slip.irg]].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-border-subtle py-[0.5em]"><dt className="text-fg-secondary">{l}</dt><dd className="num text-fg">{v < 0 ? "− " : ""}{money(Math.abs(v))}</dd></div>
                ))}
                <div className="flex items-baseline justify-between pt-[0.7em]"><dt className="font-semibold text-fg">Net à payer</dt><dd className="font-display text-h3 font-semibold text-fg num">{money(slip.net)}</dd></div>
                <div className="mt-[0.8em] flex justify-between rounded-md bg-surface-2 px-[0.7em] py-[0.5em] text-xs text-fg-muted"><dt>Coût employeur</dt><dd className="num">{money(slip.employerCost, { decimals: 0 })}</dd></div>
              </dl>
            ) : (
              <p className="rounded-md bg-surface-2 px-[0.8em] py-[0.8em] text-sm text-fg-muted">Saisissez un salaire de base à l’étape « Rémunération » pour voir le calcul.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Recap({ sections, onEdit }) {
  return (
    <div className="flex flex-col gap-[1.25em]">
      {sections.map((s) => (
        <section key={s.title}>
          <div className="mb-[0.3em] flex items-center justify-between">
            <h4 className="font-semibold text-fg">{s.title}</h4>
            <Button variant="ghost" size="sm" icon={Pencil} onClick={() => onEdit(s.step)}>Modifier</Button>
          </div>
          <dl>
            {s.rows.map(([l, v]) => (
              <div key={l} className="flex justify-between gap-[1em] border-b border-border-subtle py-[0.5em] text-sm last:border-b-0">
                <dt className="text-fg-muted">{l}</dt>
                <dd className="text-end text-fg">{v || <Badge tone="warning">Non renseigné</Badge>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
