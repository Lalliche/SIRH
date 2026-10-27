import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { amount } from "@/lib/format";
import Stamp from "@/components/ui/Stamp";
import { ArchMark } from "./Logo";
import { SAMPLE_PAYSLIP } from "./payslip-sample";

// The paper never follows the app theme: it is paper. Colours are scoped here (no hex, only tokens + `white`).
const PAPER_CSS = `
[data-paper] {
  --paper: color-mix(in srgb, white 94%, var(--clay-100));
  --paper-ink: var(--pine-950);
  --paper-muted: color-mix(in srgb, var(--pine-900) 58%, transparent);
  --paper-rule: color-mix(in srgb, var(--pine-900) 18%, transparent);
  --paper-tint: var(--pine-50);
}
`;

function Row({ k, label, value, minus = false, strong = false, activeKey, marker }) {
  const active = activeKey === k;
  return (
    <div
      data-slip-row={k}
      data-active={active}
      className={cn(
        "relative flex items-baseline gap-[0.5em] rounded-[0.25em] px-[0.5em] py-[0.24em] transition-[background-color,box-shadow] duration-200",
        "data-[active=true]:bg-(--paper-tint) data-[active=true]:shadow-[inset_0_0_0_1px_var(--pine-500)]",
        strong && "font-semibold",
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="h-0 min-w-[1em] flex-1 border-b border-dotted border-(color:--paper-rule)" />
      <span className="num whitespace-nowrap font-medium">
        {minus ? "−" : ""}
        {amount(value)}
      </span>
      {marker != null && (
        <span aria-hidden data-marker className="absolute -end-[2.1em] top-1/2 flex size-[1.6em] -translate-y-1/2 items-center justify-center rounded-full bg-pine-700 text-[0.9em] font-semibold text-pine-50">
          {marker}
        </span>
      )}
    </div>
  );
}

/**
 * The flat A4 payslip (1 : 1.414). Pure markup, scales with the font-size of its wrapper: give the wrapper a
 * width and the paper fills it; every inner size is in em of `text-[0.56em]`.
 *  - `activeKey`: "cnas" | "irg" | "net" | "patronal" highlights that ledger row.
 *  - `markers`: { cnas: 1, irg: 2, net: 3, patronal: 4 } draws numbered dots at the row end.
 *  - `stamp`: lands the cachet on the paper itself (the hero lifts it as its own layer instead).
 */
export default function PayslipPaper({ slip = SAMPLE_PAYSLIP, activeKey, markers, stamp = false, className, ...props }) {
  const m = markers ?? {};
  return (
    <>
      <style href="sirh-paper" precedence="default">
        {PAPER_CSS}
      </style>
      <div
        data-paper
        className={cn(
          "relative flex aspect-[1/1.414] w-full flex-col rounded-[0.2em] bg-(--paper) px-[2.6em] pb-[2.4em] pt-[2.8em] text-[0.56em] leading-[1.35] text-(--paper-ink) shadow-paper",
          className,
        )}
        {...props}
      >
        <header className="flex items-start justify-between gap-[1.5em]">
          <div className="flex items-center gap-[0.8em]">
            <ArchMark className="size-[2.6em]" />
            <div>
              <p className="text-[1.15em] font-semibold leading-tight">{slip.company.name}</p>
              <p className="text-[0.85em] text-(color:--paper-muted)">{slip.company.place}</p>
            </div>
          </div>
          <div className="text-end">
            <p className="font-display text-[1.1em] font-bold uppercase tracking-[0.14em]">Bulletin de paie</p>
            <p className="font-mono text-[0.85em] text-(color:--paper-muted)">{slip.period}</p>
          </div>
        </header>

        <dl className="mt-[1.2em] grid grid-cols-2 gap-x-[1.5em] gap-y-[0.7em] border-y border-(color:--paper-rule) py-[1em]">
          {[
            ["Salarié(e)", slip.employee.name],
            ["Matricule", slip.employee.matricule, true],
            ["Poste", slip.employee.job],
            ["N° CNAS", slip.employee.cnas, true],
          ].map(([dt, dd, mono]) => (
            <div key={dt}>
              <dt className="text-[0.75em] font-semibold uppercase tracking-[0.1em] text-(color:--paper-muted)">{dt}</dt>
              <dd className={cn("text-[1.02em] font-medium", mono && "font-mono text-[0.95em]")}>{dd}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-[0.9em]">
          <p className="mb-[0.3em] px-[0.5em] text-[0.75em] font-semibold uppercase tracking-[0.1em] text-(color:--paper-muted)">Gains</p>
          {slip.earnings.map((e) => (
            <Row key={e.key} k={e.key} label={e.label} value={e.amount} activeKey={activeKey} />
          ))}
          <div className="mt-[0.3em] border-t border-(color:--paper-ink)/40">
            <Row k="gross" label="Salaire brut" value={slip.gross} strong activeKey={activeKey} />
          </div>
        </div>

        <div className="mt-[0.8em]">
          <p className="mb-[0.3em] px-[0.5em] text-[0.75em] font-semibold uppercase tracking-[0.1em] text-(color:--paper-muted)">Retenues</p>
          <Row k="cnas" label={`Retenue CNAS (${slip.cnasRate})`} value={slip.cnasEmployee} minus activeKey={activeKey} marker={m.cnas} />
          <Row k="irg" label="IRG (barème progressif)" value={slip.irg} minus activeKey={activeKey} marker={m.irg} />
        </div>

        <div
          data-slip-row="net"
          data-active={activeKey === "net"}
          className="relative mt-[1em] flex items-end justify-between rounded-[0.25em] border-x border-t border-(color:--paper-ink)/60 bg-(--paper-tint) px-[1em] pb-[0.7em] pt-[0.8em] [border-bottom:0.38em_double_color-mix(in_srgb,var(--paper-ink)_70%,transparent)] transition-shadow duration-200 data-[active=true]:shadow-[0_0_0_0.2em_var(--pine-500)]"
        >
          <span className="text-[0.95em] font-semibold uppercase tracking-[0.1em]">Net à payer</span>
          <span className="num font-display text-[2.1em] font-bold leading-none tracking-[-0.02em]">
            {amount(slip.net)} <span className="text-[0.5em] font-semibold tracking-normal">DA</span>
          </span>
          {m.net != null && (
            <span aria-hidden data-marker className="absolute -end-[2.1em] top-1/2 flex size-[1.6em] -translate-y-1/2 items-center justify-center rounded-full bg-pine-700 text-[0.9em] font-semibold text-pine-50">
              {m.net}
            </span>
          )}
        </div>

        <div className="mt-[0.7em] space-y-[0.1em]">
          <Row k="patronal" label={`Cotisations patronales (${slip.employerRate})`} value={slip.cnasEmployer} activeKey={activeKey} marker={m.patronal} />
          <p className="flex items-baseline justify-between px-[0.5em] text-[0.88em] text-(color:--paper-muted)">
            <span>Coût employeur total</span>
            <span className="num">{amount(slip.employerCost)}</span>
          </p>
        </div>

        <footer className="mt-auto">
          <div className="relative flex items-center border-t border-dashed border-(color:--paper-rule) pt-[0.9em]">
            <Scissors aria-hidden className="absolute -top-[0.62em] start-[1.2em] size-[1.2em] bg-(--paper) px-[0.1em] text-(color:--paper-muted)" strokeWidth={1.5} />
            <p className="text-[0.8em] text-(color:--paper-muted)">
              Cachet et signature de l&apos;employeur
              <span className="block font-mono">Payé le {slip.payDate} · à conserver</span>
            </p>
          </div>
        </footer>

        {stamp && <Stamp label="PAYÉ" sub="OCT. 2026" className="absolute bottom-[2.6em] end-[2.4em] size-[6.4em]" />}
      </div>
    </>
  );
}
