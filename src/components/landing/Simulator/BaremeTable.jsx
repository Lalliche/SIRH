import { defaultParams } from "@/lib/payroll";
import { int, percent } from "@/lib/format";
import { simulatorPage } from "@/content/simulator";

/** Server-rendered IRG monthly scale, straight from the engine parameters. */
export default function BaremeTable() {
  const rows = [];
  let lower = 0;
  for (const { upTo, rate } of defaultParams.irgBracketsMonthly) {
    rows.push({ from: lower, upTo, rate });
    lower = upTo;
  }
  const { baremeHeaders: h } = simulatorPage;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[22em] text-start">
        <caption className="sr-only">{simulatorPage.baremeTitle}</caption>
        <thead>
          <tr className="border-b-2 border-fg text-start text-[0.75em] uppercase tracking-[0.08em] text-fg-muted">
            <th scope="col" className="px-[1em] py-[0.8em] text-start font-medium">{h.slice}</th>
            <th scope="col" className="px-[1em] py-[0.8em] text-end font-medium">{h.rate}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.from} className="border-b border-border last:border-b-0">
              <td className="px-[1em] py-[0.8em] font-mono text-code text-fg">
                {row.upTo >= 1e12 ? `Au-delà de ${int(row.from)}` : `${int(row.from + (row.from ? 1 : 0))} à ${int(row.upTo)}`}
              </td>
              <td className="px-[1em] py-[0.8em] text-end font-medium text-fg">{percent(row.rate * 100, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
