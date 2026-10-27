"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, RefreshCw } from "lucide-react";
import { Button, Card, Progress } from "@/components/ui";
import { duration, ease } from "@/lib/motion-tokens";
import { amount, fullName, int } from "@/lib/format";
import MoneyFlow from "../MoneyFlow";

const TILES = [
  ["Masse brute", "gross"],
  ["CNAS salarié", "cnasEmployee"],
  ["IRG retenu", "irg"],
  ["Net à payer", "net"],
  ["Coût employeur", "employerCost"],
];

export default function StepCalc({ model, calcDone, onDone, onRerun }) {
  const reduce = useReducedMotion();
  const total = model.lines.length;
  const [n, setN] = useState(calcDone ? total : 0);

  useEffect(() => {
    if (calcDone) return undefined;
    if (reduce || total === 0) {
      const t = setTimeout(() => setN(total), 0);
      return () => clearTimeout(t);
    }
    const iv = setInterval(() => setN((x) => Math.min(total, x + 1)), 30);
    return () => clearInterval(iv);
  }, [calcDone, reduce, total]);

  useEffect(() => {
    if (!calcDone && n >= total) onDone();
  }, [calcDone, n, total, onDone]);

  const done = calcDone || n >= total;
  const shown = done ? total : n;
  const recent = model.lines.slice(Math.max(0, shown - 4), shown).reverse();

  return (
    <div className="flex flex-col gap-[1.25em]">
      <Card>
        <div className="flex items-center justify-between gap-[1em]">
          <div>
            <h3 className="text-h3 font-semibold text-fg">{done ? "Calcul terminé" : "Calcul des bulletins en cours"}</h3>
            <p className="mt-[0.2em] text-sm text-fg-muted" aria-live="polite">
              {done ? `${int(total)} bulletins calculés, 0 erreur de calcul.` : `Bulletin ${int(shown)} sur ${int(total)}`}
            </p>
          </div>
          <span className={`flex size-[2.6em] items-center justify-center rounded-full ${done ? "bg-success-bg text-success-fg" : "bg-primary-soft text-link"}`}>
            {done ? <Check className="size-[1.3em]" aria-hidden /> : <span className="num text-sm font-semibold">{total ? Math.round((shown / total) * 100) : 0}%</span>}
          </span>
        </div>
        <Progress className="mt-[1em]" value={shown} max={Math.max(1, total)} tone={done ? "success" : "primary"} />
        <ul className="mt-[1em] min-h-[8.5em] divide-y divide-border-subtle text-sm" aria-label="Derniers bulletins calculés">
          <AnimatePresence initial={false}>
            {recent.map((l) => (
              <motion.li
                key={l.employeeId}
                layout="position"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.base, ease: ease.out }}
                className="flex items-center justify-between gap-[1em] py-[0.5em]"
              >
                <span className="flex items-center gap-[0.6em] text-fg"><Check className="size-[1em] text-success" aria-hidden />{fullName(model.empById[l.employeeId])}</span>
                <span className="text-fg-secondary num">{amount(l.net)} DA</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Card>

      {done && (
        <>
          <section aria-label="Totaux calculés" className="grid grid-cols-2 gap-[1em] lg:grid-cols-3 xxl:grid-cols-5">
            {TILES.map(([label, key]) => (
              <Card key={key} className={`!p-[1.1em] ${key === "net" ? "border-t-2 border-t-primary" : ""}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">{label}</p>
                <p className="mt-[0.4em] font-display text-[1.35em] font-semibold text-fg"><MoneyFlow value={model.totals[key]} suffix="" /></p>
                <p className="text-xs text-fg-muted">DA</p>
              </Card>
            ))}
          </section>
          <div className="flex justify-end">
            <Button variant="ghost" icon={RefreshCw} onClick={onRerun}>Relancer le calcul</Button>
          </div>
        </>
      )}
    </div>
  );
}
