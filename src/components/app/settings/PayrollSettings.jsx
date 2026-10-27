"use client";

import { useMemo, useState } from "react";
import { ArrowRight, History } from "lucide-react";
import { Badge, Button, Checkbox, TextInput, toast } from "@/components/ui";
import { db, useCollection, useDb } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { date, money } from "@/lib/format";
import { defaultParams } from "@/lib/payroll";
import { forecastPayroll } from "@/components/app/_kit/metrics";
import Section from "./Section";

// Parameters whose official value still needs verification (see specs/ux-ia.md §11).
const UNCERTAIN = { cnasEmployer: "Taux patronal CNAS", fnpos: "Taux FNPOS", abattement: "Abattement IRG (40 %, 1 000 à 1 500 DA)", irgSmoothingUpTo: "Lissage IRG jusqu'à 35 000 DA" };
const EMPTY = [];
const pctStr = (f) => String(Math.round(f * 10000) / 100).replace(".", ",");
const toNum = (s) => Number(String(s).replace(/\s/g, "").replace(",", "."));

// Draft keeps everything as strings (percent for rates) so inputs stay editable.
const toDraft = (p) => ({
  effectiveFrom: p.effectiveFrom, snmg: String(p.snmg), cnasEmployee: pctStr(p.cnasEmployee), cnasEmployer: pctStr(p.cnasEmployer), fnpos: pctStr(p.fnpos),
  abRate: pctStr(p.abattement.rate), abMin: String(p.abattement.min), abMax: String(p.abattement.max),
  irgExemptUpTo: String(p.irgExemptUpTo), irgSmoothingUpTo: String(p.irgSmoothingUpTo),
  brackets: p.irgBracketsMonthly.map((b) => ({ upTo: b.upTo >= 1e14 ? "" : String(b.upTo), rate: pctStr(b.rate) })),
});
const fromDraft = (d, base) => ({
  ...base,
  effectiveFrom: d.effectiveFrom, snmg: toNum(d.snmg), cnasEmployee: toNum(d.cnasEmployee) / 100, cnasEmployer: toNum(d.cnasEmployer) / 100, fnpos: toNum(d.fnpos) / 100,
  abattement: { rate: toNum(d.abRate) / 100, min: toNum(d.abMin), max: toNum(d.abMax) },
  irgExemptUpTo: toNum(d.irgExemptUpTo), irgSmoothingUpTo: toNum(d.irgSmoothingUpTo),
  irgBracketsMonthly: d.brackets.map((b) => ({ upTo: b.upTo === "" ? 1e15 : toNum(b.upTo), rate: toNum(b.rate) / 100 })),
});

function diffOf(a, b) {
  const rows = [];
  const add = (label, x, y) => { if (String(x) !== String(y)) rows.push({ label, from: x, to: y }); };
  add("Date d'effet", date(a.effectiveFrom), date(b.effectiveFrom));
  add("SNMG", money(a.snmg, { decimals: 0 }), money(b.snmg, { decimals: 0 }));
  add("Cotisation salariale CNAS", `${pctStr(a.cnasEmployee)} %`, `${pctStr(b.cnasEmployee)} %`);
  add("Cotisation patronale CNAS", `${pctStr(a.cnasEmployer)} %`, `${pctStr(b.cnasEmployer)} %`);
  add("FNPOS", `${pctStr(a.fnpos)} %`, `${pctStr(b.fnpos)} %`);
  add("Abattement IRG (taux)", `${pctStr(a.abattement.rate)} %`, `${pctStr(b.abattement.rate)} %`);
  add("Abattement IRG (plancher)", money(a.abattement.min, { decimals: 0 }), money(b.abattement.min, { decimals: 0 }));
  add("Abattement IRG (plafond)", money(a.abattement.max, { decimals: 0 }), money(b.abattement.max, { decimals: 0 }));
  add("Seuil d'exonération IRG", money(a.irgExemptUpTo, { decimals: 0 }), money(b.irgExemptUpTo, { decimals: 0 }));
  add("Lissage IRG jusqu'à", money(a.irgSmoothingUpTo, { decimals: 0 }), money(b.irgSmoothingUpTo, { decimals: 0 }));
  a.irgBracketsMonthly.forEach((x, i) => {
    const y = b.irgBracketsMonthly[i];
    if (!y) return;
    add(`Tranche IRG ${i + 1} (jusqu'à)`, x.upTo >= 1e14 ? "∞" : money(x.upTo, { decimals: 0 }), y.upTo >= 1e14 ? "∞" : money(y.upTo, { decimals: 0 }));
    add(`Tranche IRG ${i + 1} (taux)`, `${pctStr(x.rate)} %`, `${pctStr(y.rate)} %`);
  });
  return rows;
}

function validate(d, next) {
  const e = {};
  if (!(next.snmg > 0)) e.snmg = "SNMG invalide.";
  for (const k of ["cnasEmployee", "cnasEmployer", "fnpos"]) if (!(next[k] >= 0 && next[k] < 1)) e[k] = "Entre 0 et 100 %.";
  if (!(next.abattement.rate >= 0 && next.abattement.rate <= 1)) e.abRate = "Entre 0 et 100 %.";
  if (next.abattement.min > next.abattement.max) e.abMin = "Le plancher dépasse le plafond.";
  if (!d.effectiveFrom) e.effectiveFrom = "Date d'effet requise.";
  next.irgBracketsMonthly.forEach((b, i, arr) => {
    if (!(b.rate >= 0 && b.rate <= 1) || Number.isNaN(b.rate)) e[`br${i}`] = "Taux invalide.";
    if (i > 0 && b.upTo <= arr[i - 1].upTo) e[`bu${i}`] = "Doit dépasser la tranche précédente.";
  });
  Object.entries(next).forEach(([k, v]) => { if (typeof v === "number" && Number.isNaN(v)) e[k] = "Nombre invalide."; });
  return e;
}

export default function PayrollSettings({ user }) {
  const params = useDb((s) => s.settings.payroll) ?? defaultParams;
  const verified = useDb((s) => s.settings.payrollVerified) ?? {};
  const history = useDb((s) => s.settings.payrollHistory) ?? EMPTY;
  const employees = useCollection("employees");
  const [draft, setDraft] = useState(() => toDraft(params));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const next = useMemo(() => fromDraft(draft, params), [draft, params]);
  const changes = useMemo(() => diffOf(params, next), [params, next]);
  const impact = useMemo(() => {
    if (changes.length === 0) return null;
    const a = forecastPayroll(employees, params);
    const b = forecastPayroll(employees, next);
    return { gross: b.gross - a.gross, cost: b.employerCost - a.employerCost, net: b.net - a.net };
  }, [changes.length, employees, params, next]);

  const save = () => {
    const e = validate(draft, next);
    setErrors(e);
    if (Object.keys(e).length) return toast.error("Certains paramètres sont invalides.");
    db.update("settings", (s) => ({ ...s, payroll: next, payrollHistory: [{ at: TODAY, by: user.employeeId, effectiveFrom: next.effectiveFrom, changes: changes.map((c) => `${c.label} : ${c.from} → ${c.to}`) }, ...(s.payrollHistory ?? [])] }));
    db.audit(user.employeeId, "Paramètres de paie modifiés", "Paramètres de paie", `${changes.length} changement(s), effet au ${date(next.effectiveFrom)}`);
    toast.success("Paramètres de paie enregistrés. Les prochains calculs les utiliseront.");
  };
  const toggleVerified = (k, on) => db.update("settings", (s) => ({ ...s, payrollVerified: { ...(s.payrollVerified ?? {}), [k]: on } }));
  const flag = (k) => (
    <div className="flex items-center gap-[0.6em]">
      {verified[k] ? <Badge tone="success">Vérifié</Badge> : <Badge tone="warning">À confirmer</Badge>}
      <Checkbox checked={!!verified[k]} onChange={(on) => toggleVerified(k, on)} label={<span className="text-xs">Valeur vérifiée</span>} />
    </div>
  );

  return (
    <div className="flex flex-col gap-[1.25em]">
      <Section
        title="Paramètres de paie"
        description="Ces valeurs alimentent le moteur de calcul (bulletins, simulateur, prévisions). Les taux marqués « à confirmer » doivent être vérifiés auprès de la CNAS ou de votre conseil."
        footer={<><Button variant="ghost" disabled={changes.length === 0} onClick={() => { setDraft(toDraft(params)); setErrors({}); }}>Annuler les modifications</Button><Button disabled={changes.length === 0} onClick={save}>Enregistrer ({changes.length})</Button></>}
      >
        <div className="grid gap-[1.2em] md:grid-cols-2">
          <TextInput label="Date d'effet" type="date" value={draft.effectiveFrom} onChange={set("effectiveFrom")} error={errors.effectiveFrom} hint="Les paies antérieures ne sont pas recalculées." />
          <TextInput label="SNMG mensuel" inputMode="decimal" suffix="DA" value={draft.snmg} onChange={set("snmg")} error={errors.snmg} />
          <TextInput label="Cotisation salariale CNAS" inputMode="decimal" suffix="%" value={draft.cnasEmployee} onChange={set("cnasEmployee")} error={errors.cnasEmployee} />
          <div>
            <TextInput label="Cotisation patronale CNAS" inputMode="decimal" suffix="%" value={draft.cnasEmployer} onChange={set("cnasEmployer")} error={errors.cnasEmployer} />
            <div className="mt-[0.4em]">{flag("cnasEmployer")}</div>
          </div>
          <div>
            <TextInput label="FNPOS (œuvres sociales)" inputMode="decimal" suffix="%" value={draft.fnpos} onChange={set("fnpos")} error={errors.fnpos} />
            <div className="mt-[0.4em]">{flag("fnpos")}</div>
          </div>
          <TextInput label="Seuil d'exonération IRG" inputMode="decimal" suffix="DA" value={draft.irgExemptUpTo} onChange={set("irgExemptUpTo")} error={errors.irgExemptUpTo} />
        </div>

        <h3 className="mb-[0.6em] mt-[1.75em] font-semibold text-fg">Abattement IRG</h3>
        <div className="grid gap-[1.2em] md:grid-cols-3">
          <TextInput label="Taux" inputMode="decimal" suffix="%" value={draft.abRate} onChange={set("abRate")} error={errors.abRate} />
          <TextInput label="Plancher" inputMode="decimal" suffix="DA" value={draft.abMin} onChange={set("abMin")} error={errors.abMin} />
          <TextInput label="Plafond" inputMode="decimal" suffix="DA" value={draft.abMax} onChange={set("abMax")} />
        </div>
        <div className="mt-[0.6em] flex flex-wrap gap-x-[2em] gap-y-[0.5em]">{flag("abattement")}</div>
        <div className="mt-[1em] grid gap-[1.2em] md:grid-cols-2">
          <div>
            <TextInput label="Lissage IRG jusqu'à" inputMode="decimal" suffix="DA" value={draft.irgSmoothingUpTo} onChange={set("irgSmoothingUpTo")} error={errors.irgSmoothingUpTo} />
            <div className="mt-[0.4em]">{flag("irgSmoothingUpTo")}</div>
          </div>
        </div>

        <h3 className="mb-[0.6em] mt-[1.75em] font-semibold text-fg">Barème IRG mensuel</h3>
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-sunken text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted"><th className="px-[1em] py-[0.6em] text-start">Tranche</th><th className="px-[1em] text-start">Jusqu&apos;à (DA)</th><th className="px-[1em] text-start">Taux (%)</th></tr></thead>
            <tbody>
              {draft.brackets.map((b, i) => (
                <tr key={i} className="border-t border-border-subtle">
                  <th scope="row" className="px-[1em] py-[0.5em] text-start font-medium text-fg-secondary">{i + 1}</th>
                  <td className="px-[1em] py-[0.4em]">
                    {i === draft.brackets.length - 1 ? <span className="text-fg-muted">Au-delà de {money(toNum(draft.brackets[i - 1].upTo) || 0, { decimals: 0 })}</span> : (
                      <TextInput aria-label={`Plafond de la tranche ${i + 1}`} inputMode="decimal" value={b.upTo} error={errors[`bu${i}`]} onChange={(v) => setDraft((d) => ({ ...d, brackets: d.brackets.map((x, j) => (j === i ? { ...x, upTo: v } : x)) }))} />
                    )}
                  </td>
                  <td className="px-[1em] py-[0.4em]"><TextInput aria-label={`Taux de la tranche ${i + 1}`} inputMode="decimal" suffix="%" value={b.rate} error={errors[`br${i}`]} onChange={(v) => setDraft((d) => ({ ...d, brackets: d.brackets.map((x, j) => (j === i ? { ...x, rate: v } : x)) }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Aperçu des changements" description="Comparaison avec les valeurs actuellement appliquées.">
        {changes.length === 0 ? (
          <p className="text-sm text-fg-muted">Aucune modification en cours.</p>
        ) : (
          <>
            <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {changes.map((c) => (
                <li key={c.label} className="flex flex-wrap items-center gap-x-[1em] gap-y-[0.2em] px-[1em] py-[0.6em] text-sm">
                  <span className="min-w-[14em] flex-1 text-fg-secondary">{c.label}</span>
                  <span className="text-fg-muted line-through num">{c.from}</span>
                  <ArrowRight className="size-[1em] text-fg-faint" aria-hidden />
                  <span className="font-medium text-fg num">{c.to}</span>
                </li>
              ))}
            </ul>
            {impact && (
              <div className="mt-[1em] grid gap-[0.8em] sm:grid-cols-3">
                {[["Brut mensuel", impact.gross], ["Net mensuel", impact.net], ["Coût employeur", impact.cost]].map(([l, v]) => (
                  <div key={l} className="rounded-md bg-bg-sunken p-[0.9em]">
                    <p className="text-xs text-fg-muted">{l} (octobre, prévision)</p>
                    <p className="font-display text-h3 font-semibold text-fg num">{v > 0 ? "+" : v < 0 ? "−" : ""}{money(Math.abs(v), { decimals: 0 })}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      {history.length > 0 && (
        <Section title="Historique des modifications">
          <ul className="flex flex-col gap-[0.8em]">
            {history.map((h, i) => (
              <li key={i} className="flex gap-[0.7em] text-sm">
                <History className="mt-[0.2em] size-[1.1em] shrink-0 text-fg-muted" aria-hidden />
                <div><p className="font-medium text-fg">Modifié le {date(h.at)} · effet au {date(h.effectiveFrom)}</p><p className="text-fg-secondary">{h.changes.join(" · ")}</p></div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <p className="text-xs text-fg-muted">Taux à confirmer : {Object.values(UNCERTAIN).join(" ; ")}.</p>
    </div>
  );
}
