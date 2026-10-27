// Pure Algerian payroll engine (prototype). Rates are data, not code — see specs/ux-ia.md §9.
// Sources are secondary; every rate carries a "to verify" status before any production use.

export const defaultParams = {
  effectiveFrom: "2026-01-01",
  snmg: 24000,
  hoursPerMonth: 173.33,
  cnasEmployee: 0.09,
  cnasEmployer: 0.25,
  fnpos: 0.005,
  irgRoundTo10: true,
  irgBracketsMonthly: [
    { upTo: 20000, rate: 0 },
    { upTo: 40000, rate: 0.23 },
    { upTo: 80000, rate: 0.27 },
    { upTo: 160000, rate: 0.3 },
    { upTo: 320000, rate: 0.33 },
    { upTo: 1e15, rate: 0.35 },
  ],
  abattement: { rate: 0.4, min: 1000, max: 1500 },
  irgExemptUpTo: 30000,
  irgSmoothingUpTo: 35000,
  overtime: { standard: 0.5, night: 0.75, rest: 1 },
};

const round2 = (n) => Math.round(n * 100) / 100;

export function irgMonthly(taxable, p = defaultParams) {
  const base = p.irgRoundTo10 ? Math.floor(taxable / 10) * 10 : taxable;
  if (base <= p.irgExemptUpTo) return 0;
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of p.irgBracketsMonthly) {
    if (base > lower) tax += (Math.min(base, upTo) - lower) * rate;
    lower = upTo;
  }
  const { rate, min, max } = p.abattement;
  const abatt = Math.min(max, Math.max(min, tax * rate));
  const irg1 = Math.max(0, tax - abatt);
  if (base <= p.irgSmoothingUpTo) return Math.max(0, (irg1 * 137) / 51 - 27925 / 8);
  return irg1;
}

/**
 * @param {object} input
 * @param {number} input.baseSalary
 * @param {Array<{code:string,label:string,amount:number,cotisable?:boolean,imposable?:boolean}>} [input.components]
 * @param {number} [input.workedRatio]  1 = full month
 * @param {Array<{hours:number,kind?:"standard"|"night"|"rest"}>} [input.overtime]
 * @param {number} [input.loanDeduction]
 * @param {number} [input.otherDeductions]
 */
export function computePayslip(input, p = defaultParams) {
  const { baseSalary, components = [], workedRatio = 1, overtime = [], loanDeduction = 0, otherDeductions = 0 } = input;

  const base = baseSalary * workedRatio;
  const hourly = baseSalary / p.hoursPerMonth;
  const overtimePay = overtime.reduce((s, o) => s + hourly * o.hours * (1 + p.overtime[o.kind ?? "standard"]), 0);

  const lines = components.map((c) => ({ ...c, cotisable: c.cotisable ?? true, imposable: c.imposable ?? true }));
  const compGross = lines.reduce((s, c) => s + c.amount * workedRatio, 0);

  const gross = base + compGross + overtimePay;
  const cotisable =
    base + overtimePay + lines.filter((c) => c.cotisable).reduce((s, c) => s + c.amount * workedRatio, 0);
  const imposableGross =
    base + overtimePay + lines.filter((c) => c.imposable).reduce((s, c) => s + c.amount * workedRatio, 0);

  const cnasEmployee = cotisable * p.cnasEmployee;
  const taxable = Math.max(0, imposableGross - cnasEmployee);
  const irg = irgMonthly(taxable, p);
  const netBeforeDeductions = gross - cnasEmployee - irg;
  const net = netBeforeDeductions - loanDeduction - otherDeductions;
  const cnasEmployer = cotisable * p.cnasEmployer;
  const fnpos = cotisable * p.fnpos;
  const employerCost = gross + cnasEmployer + fnpos;

  return {
    base: round2(base),
    overtimePay: round2(overtimePay),
    components: lines.map((c) => ({ ...c, amount: round2(c.amount * workedRatio) })),
    gross: round2(gross),
    cotisable: round2(cotisable),
    cnasEmployee: round2(cnasEmployee),
    taxable: round2(taxable),
    irg: round2(irg),
    loanDeduction: round2(loanDeduction),
    otherDeductions: round2(otherDeductions),
    net: round2(net),
    cnasEmployer: round2(cnasEmployer),
    fnpos: round2(fnpos),
    employerCost: round2(employerCost),
  };
}

// Simple gross → net for the landing simulator / what-if (everything cotisable + imposable)
export function grossToNet(gross, p = defaultParams) {
  return computePayslip({ baseSalary: gross }, p);
}

// Reverse solve: which gross gives a target net? (bisection, tolerance 0.5 DA)
export function netToGross(targetNet, p = defaultParams) {
  let lo = targetNet;
  let hi = targetNet * 3 + 10000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (grossToNet(mid, p).net < targetNet) lo = mid;
    else hi = mid;
    if (hi - lo < 0.5) break;
  }
  return round2((lo + hi) / 2);
}

// Marginal take-home curve for charts
export function takeHomeCurve(from = 24000, to = 300000, steps = 40, p = defaultParams) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const g = from + ((to - from) * i) / steps;
    const r = grossToNet(g, p);
    out.push({ gross: g, net: r.net, rate: g ? 1 - r.net / g : 0 });
  }
  return out;
}
