import { Check, Minus } from "lucide-react";
import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";
import { pricingMatrix as m } from "@/content/pricing";
import { cn } from "@/lib/utils";

function Cell({ value, highlighted }) {
  return (
    <td className={cn("px-[1em] py-[0.85em] text-center align-middle text-sm", highlighted && "bg-primary-soft/40")}>
      {value === true ? (
        <>
          <Check aria-hidden className="mx-auto size-[1.2em] text-pine-600" strokeWidth={2} />
          <span className="sr-only">{m.yes}</span>
        </>
      ) : value === false ? (
        <>
          <Minus aria-hidden className="mx-auto size-[1.2em] text-fg-faint" strokeWidth={1.75} />
          <span className="sr-only">{m.no}</span>
        </>
      ) : (
        <span className="font-medium text-fg">{value}</span>
      )}
    </td>
  );
}

/** Feature matrix for /tarifs. Server component, semantic table, horizontally scrollable on phones. */
export default function ComparisonTable() {
  return (
    <section aria-labelledby="comparatif-title" className="py-[4em] md:py-[6em]">
      <Container>
        <Reveal>
          <h2 id="comparatif-title" className="mb-[1.5em] font-display text-[1.875em] font-semibold tracking-[-0.025em] text-balance text-fg md:text-[2.25em]">{m.title}</h2>
        </Reveal>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[40em] border-collapse text-start">
            <thead>
              <tr className="border-b-2 border-fg">
                <th scope="col" className="px-[1em] py-[1em] text-start text-[0.75em] font-medium uppercase tracking-[0.08em] text-fg-muted">Fonctionnalité</th>
                {m.tierNames.map((name, i) => (
                  <th key={name} scope="col" className={cn("px-[1em] py-[1em] text-center font-display text-[1.0625em] font-semibold text-fg", i === 1 && "border-t-[2px] border-t-primary bg-primary-soft/40")}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            {m.groups.map((group) => (
              <tbody key={group.name}>
                <tr>
                  <th scope="rowgroup" colSpan={4} className="bg-surface-2 px-[1em] py-[0.6em] text-start font-mono text-[0.75em] font-medium uppercase tracking-[0.08em] text-fg-muted">{group.name}</th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-[1em] py-[0.85em] text-start text-sm font-normal text-fg-secondary">{row.label}</th>
                    {row.values.map((v, i) => (
                      <Cell key={i} value={v} highlighted={i === 1} />
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Container>
    </section>
  );
}
