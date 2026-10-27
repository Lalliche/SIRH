"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

/**
 * Renders children into a body-level portal that is invisible on screen and becomes
 * the ONLY visible thing when printing (window.print → "Enregistrer en PDF").
 */
export function PrintOnly({ children }) {
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <div className="sirh-print hidden bg-white text-[14px] text-black print:block">
      <style>{"@media print { body > *:not(.sirh-print) { display: none !important; } @page { size: A4; margin: 12mm; } }"}</style>
      {children}
    </div>,
    document.body,
  );
}

/** A4-like white sheet (always light, whatever the theme). */
export function Paper({ className, children }) {
  return (
    <article className={cn("mx-auto w-full max-w-[49.6em] bg-white p-[2.5em] text-black shadow-paper print:max-w-none print:p-0 print:shadow-none", className)}>
      {children}
    </article>
  );
}

export const printPage = () => window.print();
