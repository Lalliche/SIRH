"use client";

import { useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { Badge, Button, Card, CardHeader, Segmented, TextInput } from "@/components/ui";
import MoneyFlow from "@/components/app/payroll/MoneyFlow";
import { useParams } from "@/components/app/payroll/hooks";
import { useCollection } from "@/lib/db";
import { amount, fullName, money, pluralize } from "@/lib/format";
import { snmgImpact } from "@/lib/payroll-run";

const PRESETS = [24000, 25000, 30000, 50000];

/** "Impact sur votre paie" alert: SNMG change → extra cost computed with the payroll engine. */
export default function SnmgImpact() {
  const params = useParams();
  const employees = useCollection("employees");
  const [snmg, setSnmg] = useState(25000);
  const [text, setText] = useState(null);
  const impact = useMemo(() => snmgImpact(employees, snmg, params), [employees, snmg, params]);
  const byId = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const change = snmg !== params.snmg;

  return (
    <Card>
      <CardHeader
        title="Impact sur votre paie"
        description="Simulez un relèvement du SNMG : le moteur de paie recalcule les salariés concernés."
        action={<Badge tone={impact.count ? "warning" : "success"} icon={BellRing}>{change ? "Simulation" : "Situation actuelle"}</Badge>}
      />
      <div className="flex flex-wrap items-end gap-[0.8em]">
        <Segmented size="sm" value={PRESETS.includes(snmg) ? String(snmg) : ""} onChange={(v) => { setSnmg(Number(v)); setText(null); }} options={PRESETS.map((p) => ({ value: String(p), label: p === params.snmg ? `${amount(p, { decimals: 0 })} (actuel)` : amount(p, { decimals: 0 }) }))} />
        <TextInput
          aria-label="SNMG simulé"
          suffix="DA"
          inputMode="decimal"
          className="w-[10em]"
          value={text ?? String(snmg)}
          onChange={(v) => {
            setText(v);
            const n = Number(v.replace(/\s| /g, "").replace(",", "."));
            if (Number.isFinite(n) && n > 0) setSnmg(n);
          }}
          onBlur={() => setText(null)}
        />
      </div>

      <div className="mt-[1.2em] rounded-md bg-bg-sunken p-[1em]" aria-live="polite">
        {impact.count === 0 ? (
          <p className="text-sm text-fg-secondary">Avec un SNMG de {money(snmg, { decimals: 0 })}, aucun salarié n’est concerné : tous les salaires de base sont au-dessus.</p>
        ) : (
          <>
            <p className="text-sm text-fg-secondary">Avec un SNMG de {money(snmg, { decimals: 0 })} :</p>
            <p className="mt-[0.3em] font-display text-[1.7em] font-semibold text-fg">
              <MoneyFlow value={impact.deltaEmployerCost} prefix="+" suffix={" DA / mois"} />
            </p>
            <p className="text-sm text-fg-secondary">de coût employeur pour {pluralize(impact.count, "salarié")} à remonter, soit <span className="num">{money(impact.deltaEmployerCost * 12, { decimals: 0 })}</span> sur l’année (brut +{amount(impact.deltaGross, { decimals: 0 })} DA / mois).</p>
          </>
        )}
      </div>

      {impact.rows.length > 0 && (
        <ul className="mt-[1em] divide-y divide-border-subtle text-sm">
          {impact.rows.slice(0, 5).map((r) => (
            <li key={r.employeeId} className="flex items-center justify-between gap-[1em] py-[0.55em]">
              <span className="min-w-0 truncate"><span className="font-medium text-fg">{fullName(byId[r.employeeId])}</span> <span className="text-fg-muted num">{amount(r.from, { decimals: 0 })} → {amount(r.to, { decimals: 0 })}</span></span>
              <span className="shrink-0 text-fg-secondary num">+{amount(r.deltaEmployerCost, { decimals: 0 })} DA</span>
            </li>
          ))}
          {impact.rows.length > 5 && <li className="py-[0.55em] text-fg-muted">+ {impact.rows.length - 5} autres salariés</li>}
        </ul>
      )}
      <div className="mt-[1em] flex items-center justify-between gap-[1em]">
        <p className="text-xs text-fg-muted">Comparaison sur le salaire de base [à confirmer]. Hypothèse de démonstration, aucune décision officielle.</p>
        {impact.rows[0] && <Button size="sm" variant="soft" href={`/app/employees/${impact.rows[0].employeeId}?tab=pay`}>Voir le dossier</Button>}
      </div>
    </Card>
  );
}
