"use client";

import NumberFlow from "@number-flow/react";

/** Fires once per mount (NumberFlow animates any value change; the panel only sets the real value after reveal). */
export default function PreviewKpi({ label, value, hint, suffix = "", played }) {
  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-[0.75em] py-[0.6em]">
      <p className="truncate text-[0.6em] font-semibold uppercase tracking-[0.08em] text-fg-muted">{label}</p>
      <p className="num font-display text-[1.25em] font-semibold leading-[1.15] tracking-[-0.02em] text-fg">
        <NumberFlow
          value={played ? value : 0}
          locales="fr-FR"
          format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
          suffix={suffix}
          transformTiming={{ duration: 1100, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
          willChange
        />
      </p>
      <p className="truncate text-[0.6em] text-fg-muted">{hint}</p>
    </div>
  );
}
