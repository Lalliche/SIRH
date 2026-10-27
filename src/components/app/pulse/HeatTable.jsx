import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DRIVERS, MIN_GROUP, level } from "./compute";

const tint = (v) => (v >= 75 ? "bg-success-bg text-success-fg" : v >= 60 ? "bg-warning-bg text-warning-fg" : "bg-danger-bg text-danger-fg");

export default function HeatTable({ rows, selected, onSelect }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Score de santé par service et par facteur, de 0 à 100</caption>
        <thead>
          <tr className="h-[2.6em] bg-bg-sunken text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
            <th scope="col" className="ps-[1.25em] text-start">Service</th>
            <th scope="col" className="px-[0.6em] text-end">Effectif</th>
            {DRIVERS.map((d) => <th key={d.key} scope="col" title={d.hint} className="px-[0.6em] text-center">{d.label}</th>)}
            <th scope="col" className="pe-[1.25em] ps-[0.6em] text-center">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, name, pulse }) => (
            <tr key={id} className={cn("border-t border-border-subtle", selected === id && "bg-primary-soft")}>
              <th scope="row" className="ps-[1.25em] text-start font-medium text-fg">
                {pulse.hidden ? (
                  <span>{name}</span>
                ) : (
                  <button type="button" onClick={() => onSelect(id)} className="py-[0.7em] text-start hover:underline" aria-pressed={selected === id}>{name}</button>
                )}
              </th>
              <td className="px-[0.6em] text-end text-fg-secondary num">{pulse.size}</td>
              {pulse.hidden ? (
                <td colSpan={DRIVERS.length + 1} className="pe-[1.25em] ps-[0.6em] py-[0.7em] text-center text-xs text-fg-muted">
                  <span className="inline-flex items-center gap-[0.5em]"><Lock className="size-[1.1em]" aria-hidden />Masqué : moins de {MIN_GROUP} personnes (confidentialité)</span>
                </td>
              ) : (
                <>
                  {DRIVERS.map((d) => (
                    <td key={d.key} className="px-[0.3em] py-[0.3em] text-center">
                      <span className={cn("inline-flex h-[2em] w-full min-w-[3em] items-center justify-center rounded-sm font-medium num", tint(pulse.scores[d.key]))}>{pulse.scores[d.key]}</span>
                    </td>
                  ))}
                  <td className="pe-[1em] ps-[0.3em] py-[0.3em] text-center">
                    <span className={cn("inline-flex h-[2em] w-full min-w-[3.4em] items-center justify-center rounded-sm font-semibold num", tint(pulse.score))} title={level(pulse.score).label}>{pulse.score}</span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border-subtle px-[1.25em] py-[0.7em] text-xs text-fg-muted">
        Vert ≥ 75 · Orange 60–74 · Rouge &lt; 60. Le sens est toujours donné par le chiffre, jamais par la couleur seule.
      </p>
    </div>
  );
}
