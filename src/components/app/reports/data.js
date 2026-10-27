"use client";

import { useMemo } from "react";
import { useCollection, useDb } from "@/lib/db";
import { defaultParams } from "@/lib/payroll";

/** All collections the analytics need, memoised as one object. */
export function useHrData() {
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const payrollRuns = useCollection("payrollRuns");
  const attendance = useCollection("attendance");
  const leaveRequests = useCollection("leaveRequests");
  const documents = useCollection("documents");
  const settings = useDb((s) => s.settings);
  return useMemo(
    () => ({ employees, departments, entities, payrollRuns, attendance, leaveRequests, documents, params: settings?.payroll ?? defaultParams }),
    [employees, departments, entities, payrollRuns, attendance, leaveRequests, documents, settings],
  );
}

const SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const shortMonth = (period) => SHORT[Number(period.slice(5, 7)) - 1];

export const compact = (n) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",")} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(Math.round(n));
};
