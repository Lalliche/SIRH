"use client";

import { useMemo, useState } from "react";
import { Info, Plus, Scale, Target, Trash2, TrendingUp } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Segmented, TextInput, Toggle } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { db, useDb } from "@/lib/db";
import { amount, money, percent } from "@/lib/format";
import { takeHomeCurve } from "@/lib/payroll";
import { DEFAULT_SCENARIO, irgBreakdown, simulate, solveBaseForNet } from "@/lib/payroll-run";
import { cn } from "@/lib/utils";
import MoneyFlow from "./MoneyFlow";
import { useParams } from "./hooks";
import { RangeField, TakeHomeChart, Waterfall } from "./SimulatorParts";

const EMPTY = [];
const CAVEATS = [
  ["Lissage 30 001 – 35 000 DA", "Formule issue d'une seule source détaillée ; recoupée avec ses exemples chiffrés."],
  ["Arrondi de l'imposable à la dizaine", "Pratique courante des logiciels de paie, non confirmée par un texte."],
  ["Panier, transport, IEP : cotisables et imposables ?", "Le traitement varie selon les cas ; utilisez les interrupteurs pour tester."],
  ["Primes non mensuelles (retenue de 10 %)", "Source unique : non appliquée ici, l'IRG est calculé au barème."],
  ["Plancher et plafond de l'assiette CNAS", "Non modélisés dans le prototype."],
];

function Body() {
  const params = useParams();
  const saved = useDb((s) => s.simulatorScenarios ?? EMPTY);
  const [s, setS] = useState(DEFAULT_SCENARIO);
  const [targetText, setTargetText] = useState("60000");
  const [name, setName] = useState("");
  const [chartView, setChartView] = useState("courbe");
  const set = (patch) => setS((x) => ({ ...x, ...patch }));

  const slip = useMemo(() => simulate(s, params), [s, params]);
  const irg = useMemo(() => irgBreakdown(slip.taxable, params), [slip.taxable, params]);
  const marginal = useMemo(() => {
    const step = 1000;
    const bumped = simulate({ ...s, base: s.base + step / (1 + (s.raisePct || 0) / 100) }, params);
    const gain = (bumped.net - slip.net) / (bumped.gross - slip.gross || 1);
    return { gain: gain * step, rate: 1 - gain };
  }, [s, slip, params]);
  const curve = useMemo(() => takeHomeCurve(24000, 300000, 36, params), [params]);

  const target = Number(targetText.replace(/\s| /g, "").replace(",", "."));
  const solved = useMemo(() => {
    if (!Number.isFinite(target) || target <= 0) return null;
    const base = solveBaseForNet(target, s, params);
    return { base, slip: simulate({ ...s, base, raisePct: 0 }, params) };
  }, [target, s, params]);

  const cols = [...saved.map((x) => ({ id: x.id, name: x.name, slip: simulate(x.scenario, params), saved: true })), { id: "now", name: "Scénario en cours", slip, saved: false }];
  const baseNet = cols[0].slip.net;
  const rate = (sl) => (sl.gross ? 1 - sl.net / sl.gross : 0);

  const save = () => {
    if (saved.length >= 3) return;
    const label = name.trim() || `Scénario ${"ABC"[saved.length]}`;
    db.set("simulatorScenarios", [...saved, { id: `sc-${saved.length + 1}-${Math.round(s.base)}-${Math.round(s.prime)}`, name: label, scenario: s }]);
    setName("");
  };
  const remove = (id) => db.set("simulatorScenarios", saved.filter((x) => x.id !== id));

  const rowsCompare = [
    ["Salaire brut", (sl) => sl.gross, "money"],
    ["CNAS salarié", (sl) => -sl.cnasEmployee, "money"],
    ["IRG", (sl) => -sl.irg, "money"],
    ["Net à payer", (sl) => sl.net, "strong"],
    ["Coût employeur", (sl) => sl.employerCost, "money"],
    ["Prélèvement salarié", (sl) => rate(sl), "pct"],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Paie"
        title="Simulateur de paie"
        description="Et si ? Faites varier le brut, une augmentation, une prime ou le panier, et voyez le net, l'IRG et le coût employeur se recalculer en direct."
        actions={<Badge tone="info" icon={Info}>Estimation, à confirmer avec votre expert-comptable</Badge>}
      />

      <div className="grid items-start gap-[1.25em] lg:grid-cols-[22em_minmax(0,1fr)]">
        <div className="flex flex-col gap-[1.25em] lg:sticky lg:top-[1em]">
          <Card>
            <CardHeader title="Hypothèses" description="Mensuel, en dinars algériens" />
            <div className="flex flex-col gap-[1.3em]">
              <RangeField label="Salaire de base" value={s.base} onChange={(v) => set({ base: v })} min={24000} max={400000} step={500} />
              <RangeField label="Augmentation" unit="%" value={s.raisePct} onChange={(v) => set({ raisePct: v })} min={0} max={30} step={0.5} hint={s.raisePct ? `base ${amount(s.base * (1 + s.raisePct / 100), { decimals: 0 })}` : undefined} />
              <RangeField label="Prime mensuelle" value={s.prime} onChange={(v) => set({ prime: v })} min={0} max={150000} step={1000} />
              <RangeField label="Indemnité de panier" value={s.panier} onChange={(v) => set({ panier: v })} min={0} max={20000} step={500} />
              <div className="flex flex-col gap-[0.7em] rounded-md bg-bg-sunken p-[0.9em] text-sm">
                <div className="flex items-center justify-between gap-[1em]"><span className="text-fg-secondary">Panier soumis à la CNAS</span><Toggle size="sm" label="Panier soumis à la CNAS" checked={s.panierCotisable} onChange={(v) => set({ panierCotisable: v })} /></div>
                <div className="flex items-center justify-between gap-[1em]"><span className="text-fg-secondary">Panier soumis à l’IRG</span><Toggle size="sm" label="Panier soumis à l'IRG" checked={s.panierImposable} onChange={(v) => set({ panierImposable: v })} /></div>
                <p className="text-xs text-fg-muted">Traitement du panier [à confirmer].</p>
              </div>
              <Button variant="ghost" onClick={() => setS(DEFAULT_SCENARIO)}>Réinitialiser</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quel brut pour un net de…" description="Calcul inverse, mêmes hypothèses de prime et de panier" action={<Target className="size-[1.2em] text-fg-faint" aria-hidden />} />
            <TextInput label="Net souhaité" inputMode="decimal" suffix="DA" value={targetText} onChange={setTargetText} error={solved ? undefined : "Saisissez un montant supérieur à 0."} />
            {solved && (
              <div className="mt-[1em]" aria-live="polite">
                <p className="text-xs text-fg-muted">Salaire brut nécessaire</p>
                <p className="font-display text-[1.7em] font-semibold text-fg"><MoneyFlow value={solved.slip.gross} /></p>
                <p className="text-xs text-fg-muted">dont base {money(solved.base, { decimals: 0 })} · coût employeur {money(solved.slip.employerCost, { decimals: 0 })}</p>
                <Button className="mt-[0.8em]" size="sm" variant="soft" onClick={() => set({ base: Math.round(solved.base), raisePct: 0 })}>Appliquer au curseur</Button>
              </div>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[1.25em]">
          <Card className="border-t-2 border-t-primary">
            <div className="flex flex-wrap items-end justify-between gap-[1em]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Net à payer</p>
                <p className="font-display text-[2.8em] font-semibold leading-none text-fg"><MoneyFlow value={slip.net} decimals={2} /></p>
                <p className="mt-[0.4em] text-sm text-fg-secondary">sur un brut de <MoneyFlow value={slip.gross} /> · prélèvement salarié {percent(Math.round(rate(slip) * 1000) / 10)}</p>
              </div>
              <div className="text-end">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Coût employeur</p>
                <p className="font-display text-[1.6em] font-semibold text-fg"><MoneyFlow value={slip.employerCost} /></p>
              </div>
            </div>
            <div className="mt-[1.4em]"><Waterfall slip={slip} /></div>
            <p className="mt-[1em] flex items-start gap-[0.6em] rounded-md bg-primary-soft p-[0.8em] text-sm text-link">
              <TrendingUp className="mt-[0.1em] size-[1.2em] shrink-0" aria-hidden />
              <span>Taux marginal : sur 1 000 DA de brut en plus, il vous reste <strong className="num">{amount(marginal.gain, { decimals: 0 })} DA</strong> net, soit un prélèvement de <strong className="num">{percent(Math.round(marginal.rate * 1000) / 10)}</strong>.</span>
            </p>
          </Card>

          <Card>
            <CardHeader title="Calcul de l'IRG, pas à pas" description="Chaque nombre est expliqué" />
            <dl className="mb-[1em] grid gap-[0.7em] text-sm sm:grid-cols-3">
              <div><dt className="text-fg-muted">Brut cotisable</dt><dd className="num">{money(slip.cotisable)}</dd></div>
              <div><dt className="text-fg-muted">− CNAS salarié (9 %)</dt><dd className="num">{money(slip.cnasEmployee)}</dd></div>
              <div><dt className="text-fg-muted">Base imposable{irg.base !== slip.taxable ? ", arrondie à la dizaine" : ""}</dt><dd className="font-medium num">{money(irg.base)}</dd></div>
            </dl>
            {irg.exempt ? (
              <p className="rounded-md bg-success-bg p-[0.8em] text-sm text-success-fg">Base imposable inférieure ou égale à {money(params.irgExemptUpTo, { decimals: 0 })} : aucun IRG n’est dû.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-fg-muted"><th className="py-[0.4em] text-start font-medium">Tranche mensuelle</th><th className="py-[0.4em] text-end font-medium">Taux</th><th className="py-[0.4em] text-end font-medium">Impôt (DA)</th></tr></thead>
                <tbody>
                  {irg.slices.map((sl) => (
                    <tr key={sl.from} className="border-t border-border-subtle"><td className="py-[0.4em] num">{amount(sl.from, { decimals: 0 })} – {amount(sl.to, { decimals: 0 })}</td><td className="py-[0.4em] text-end num">{percent(sl.rate * 100, 0)}</td><td className="py-[0.4em] text-end num">{amount(sl.amount)}</td></tr>
                  ))}
                  <tr className="border-t border-border-subtle"><td className="py-[0.4em] text-fg-secondary" colSpan={2}>Barème : total</td><td className="py-[0.4em] text-end num">{amount(irg.tax)}</td></tr>
                  <tr><td className="py-[0.4em] text-fg-secondary" colSpan={2}>Abattement de 40 % (plancher 1 000, plafond 1 500)</td><td className="py-[0.4em] text-end num">−{amount(irg.abattement)}</td></tr>
                  {irg.smoothed && <tr><td className="py-[0.4em] text-fg-secondary" colSpan={2}>Lissage 30 001 – 35 000 DA [à confirmer]</td><td className="py-[0.4em] text-end num">{amount(irg.irg - irg.irg1)}</td></tr>}
                  <tr className="border-t-[3px] border-double border-border-strong font-semibold"><td className="py-[0.5em]" colSpan={2}>IRG mensuel</td><td className="py-[0.5em] text-end num">{amount(irg.irg)}</td></tr>
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Comparer des scénarios"
              description={`${saved.length} sur 3 enregistrés`}
              action={<Scale className="size-[1.2em] text-fg-faint" aria-hidden />}
            />
            <div className="mb-[1em] flex flex-wrap items-end gap-[0.6em]">
              <TextInput label="Nom du scénario" className="w-[15em]" value={name} onChange={setName} placeholder={`Scénario ${"ABC"[Math.min(saved.length, 2)]}`} />
              <Button icon={Plus} onClick={save} disabled={saved.length >= 3}>Enregistrer ce scénario</Button>
            </div>
            {saved.length === 0 ? (
              <EmptyState className="!py-[1.5em]" title="Aucun scénario enregistré" description="Réglez les curseurs puis enregistrez jusqu'à trois scénarios pour les comparer côte à côte." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32em] text-sm">
                  <thead>
                    <tr className="text-xs text-fg-muted">
                      <th className="py-[0.5em] text-start font-medium"><span className="sr-only">Indicateur</span></th>
                      {cols.map((c) => (
                        <th key={c.id} className="px-[0.6em] py-[0.5em] text-end font-semibold text-fg">
                          <span className="inline-flex items-center gap-[0.4em]">{c.name}{c.saved && <Button variant="ghost" size="icon" className="!size-[1.8em]" aria-label={`Supprimer ${c.name}`} onClick={() => remove(c.id)}><Trash2 className="size-[1.1em]" /></Button>}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowsCompare.map(([label, fn, kind]) => (
                      <tr key={label} className={cn("border-t border-border-subtle", kind === "strong" && "border-t-[3px] border-double border-border-strong bg-pine-50 font-semibold dark:bg-primary-soft")}>
                        <td className="py-[0.5em] ps-[0.4em] text-fg-secondary">{label}</td>
                        {cols.map((c) => <td key={c.id} className="px-[0.6em] py-[0.5em] text-end num">{kind === "pct" ? percent(Math.round(fn(c.slip) * 1000) / 10) : amount(fn(c.slip))}</td>)}
                      </tr>
                    ))}
                    <tr className="border-t border-border-subtle">
                      <td className="py-[0.5em] ps-[0.4em] text-fg-secondary">Écart de net vs {cols[0].name}</td>
                      {cols.map((c, i) => <td key={c.id} className="px-[0.6em] py-[0.5em] text-end num">{i === 0 ? "—" : `${c.slip.net - baseNet >= 0 ? "+" : "−"}${amount(Math.abs(c.slip.net - baseNet))}`}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Courbe du net selon le brut" description="Où que vous soyez sur la courbe, le point vert est votre scénario" action={<Segmented size="sm" value={chartView} onChange={setChartView} options={[{ value: "courbe", label: "Courbe" }, { value: "valeurs", label: "Valeurs" }]} />} />
            {chartView === "courbe" ? (
              <TakeHomeChart curve={curve} current={slip} points={saved.map((x) => ({ id: x.id, name: x.name, ...simulate(x.scenario, params) }))} />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-fg-muted"><th className="py-[0.4em] text-start font-medium">Brut (DA)</th><th className="py-[0.4em] text-end font-medium">Net (DA)</th><th className="py-[0.4em] text-end font-medium">Prélèvement</th></tr></thead>
                <tbody>{curve.filter((_, i) => i % 4 === 0).map((c) => (<tr key={c.gross} className="border-t border-border-subtle"><td className="py-[0.4em] num">{amount(c.gross, { decimals: 0 })}</td><td className="py-[0.4em] text-end num">{amount(c.net, { decimals: 0 })}</td><td className="py-[0.4em] text-end num">{percent(Math.round(c.rate * 1000) / 10)}</td></tr>))}</tbody>
              </table>
            )}
          </Card>

          <Card className="bg-surface-2">
            <CardHeader title="À confirmer avec votre expert-comptable" description="Règles incertaines, issues du registre des incertitudes" />
            <ul className="flex flex-col gap-[0.7em] text-sm">
              {CAVEATS.map(([t, d]) => (
                <li key={t} className="flex gap-[0.6em]"><Info className="mt-[0.15em] size-[1.1em] shrink-0 text-info" aria-hidden /><span><span className="font-medium text-fg">{t}.</span> <span className="text-fg-secondary">{d}</span></span></li>
              ))}
            </ul>
            <p className="mt-[1em] text-xs text-fg-muted">Barèmes à jour au 1er janvier 2026 (SNMG {money(params.snmg, { decimals: 0 })}). Prototype : ne constitue pas un conseil fiscal.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function Simulator() {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{() => <Body />}</AccessGate>;
}
