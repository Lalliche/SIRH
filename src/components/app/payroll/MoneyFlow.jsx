"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

/** Animated money figure (count-up on change). Respects prefers-reduced-motion natively. */
export default function MoneyFlow({ value, decimals = 0, suffix = " DA", prefix, className, trend }) {
  return (
    <NumberFlow
      value={Number.isFinite(value) ? value : 0}
      locales="fr-FR"
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      prefix={prefix}
      suffix={suffix}
      trend={trend}
      className={cn("num", className)}
    />
  );
}
