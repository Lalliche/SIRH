"use client";

import { amount, money, percent } from "@/lib/format";
import { irgBreakdown } from "@/lib/payroll-run";
import { defaultParams } from "@/lib/payroll";

/** "Show your math": plain-language walk through one payslip, with the IRG slices. */
export default function PayslipExplain({ line, params = defaultParams }) {
  const irg = irgBreakdown(line.taxable, params);
  const extras = (line.components ?? []).reduce((s, c) => s + c.amount, 0);
  const steps = [
    {
      title: "Votre salaire brut",
      body: `${money(line.gross)} : salaire de base ${money(line.base)}${extras ? `, indemnités et primes ${money(extras)}` : ""}${line.overtimePay ? `, heures supplémentaires ${money(line.overtimePay)}` : ""}.`,
    },
    {
      title: "Cotisation CNAS",
      body: `${percent(params.cnasEmployee * 100)} du brut cotisable (${money(line.cotisable)}), soit ${money(line.cnasEmployee)}. Elle finance vos assurances sociales, votre retraite et l'assurance chômage.`,
    },
    {
      title: "Base imposable",
      body: `Brut imposable moins la CNAS : ${money(line.taxable)}.`,
    },
    {
      title: "IRG (impôt sur le revenu)",
      body: irg.exempt
        ? `Votre base imposable est inférieure ou égale à ${money(params.irgExemptUpTo, { decimals: 0 })} : aucun IRG n'est dû.`
        : `Barème par tranches sur ${money(irg.base)} : ${money(irg.tax)}, moins un abattement de ${money(irg.abattement)}${irg.smoothed ? ", puis lissage de la zone 30 000 – 35 000 DA [à confirmer]" : ""}. IRG retenu : ${money(line.irg)}.`,
    },
    ...(line.loanDeduction || line.otherDeductions
      ? [{ title: "Autres retenues", body: `Prêt / avance : ${money(line.loanDeduction)}${line.otherDeductions ? `, autres : ${money(line.otherDeductions)}` : ""}.` }]
      : []),
    {
      title: "Net à payer",
      body: `${money(line.gross)} − ${money(line.cnasEmployee)} − ${money(line.irg)}${line.loanDeduction || line.otherDeductions ? ` − ${money(line.loanDeduction + line.otherDeductions)}` : ""} = ${money(line.net)}.`,
    },
  ];
  return (
    <div>
      <ol className="flex flex-col gap-[0.9em]">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-[0.8em]">
            <span aria-hidden className="mt-[0.15em] flex size-[1.6em] shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-link num">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{s.title}</p>
              <p className="text-sm text-fg-secondary">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {!irg.exempt && (
        <table className="mt-[1em] w-full text-xs">
          <caption className="mb-[0.4em] text-start font-semibold uppercase tracking-[0.06em] text-fg-muted">Détail du barème IRG</caption>
          <thead>
            <tr className="text-fg-muted">
              <th className="py-[0.3em] text-start font-medium">Tranche mensuelle</th>
              <th className="py-[0.3em] text-end font-medium">Taux</th>
              <th className="py-[0.3em] text-end font-medium">Impôt (DA)</th>
            </tr>
          </thead>
          <tbody>
            {irg.slices.map((s) => (
              <tr key={s.from} className="border-t border-border-subtle">
                <td className="py-[0.3em] num">{amount(s.from, { decimals: 0 })} – {amount(s.to, { decimals: 0 })}</td>
                <td className="py-[0.3em] text-end num">{percent(s.rate * 100, 0)}</td>
                <td className="py-[0.3em] text-end num">{amount(s.amount)}</td>
              </tr>
            ))}
            <tr className="border-t border-border-subtle text-fg-secondary">
              <td className="py-[0.3em]" colSpan={2}>Abattement de 40 % (plancher 1 000, plafond 1 500)</td>
              <td className="py-[0.3em] text-end num">−{amount(irg.abattement)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
