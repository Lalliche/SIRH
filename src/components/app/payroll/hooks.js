"use client";

import { useMemo } from "react";
import { byId, useCollection, useDb } from "@/lib/db";
import { defaultParams } from "@/lib/payroll";
import { TODAY } from "@/lib/clock";
import {
  buildLines, defaultVariables, diffLines, employeesInScope, mergeVariables, prevPeriod, runPreflight, totalsOf,
} from "@/lib/payroll-run";

const EMPTY = [];
const EMPTY_OBJ = {};

export const useParams = () => useDb((s) => s.settings?.payroll ?? defaultParams);
export const useDrafts = () => useDb((s) => s.payrollDrafts ?? EMPTY);

/** Persisted runs sorted oldest → newest. */
export function usePayrollRuns() {
  const runs = useCollection("payrollRuns");
  return useMemo(() => [...runs].sort((a, b) => a.period.localeCompare(b.period)), [runs]);
}

export function useEmployeesById() {
  const employees = useCollection("employees");
  return useMemo(() => byId(employees), [employees]);
}

/**
 * Everything the wizard (and the home page preview) needs for one period, derived live from the db:
 * variables = defaults (leave / attendance / loans) + the user's edits; lines; diff vs previous run; pre-flight.
 */
export function usePayrollModel({ period, scope, edits = EMPTY_OBJ }) {
  const employees = useCollection("employees");
  const leaveRequests = useCollection("leaveRequests");
  const attendance = useCollection("attendance");
  const loans = useCollection("loans");
  const runs = usePayrollRuns();
  const params = useParams();

  return useMemo(() => {
    const payable = employeesInScope(employees, period, null);
    const defaults = defaultVariables({ period, employees: payable, leaveRequests, attendance, loans });
    const variables = mergeVariables(defaults, edits);
    const scoped = employeesInScope(employees, period, scope);
    const lines = buildLines({ period, employees, variables, scope, params });
    const prevRun = runs.find((r) => r.period === prevPeriod(period)) ?? null;
    const prevLines = prevRun?.lines ?? EMPTY;
    const empById = byId(employees);
    const diff = diffLines(lines, prevLines, empById, period);
    const preflight = runPreflight({ period, employees: scoped, lines, prevLines, leaveRequests, params, today: TODAY });
    return { employees: scoped, empById, defaults, variables, lines, totals: totalsOf(lines), prevRun, prevLines, diff, preflight, params };
  }, [employees, leaveRequests, attendance, loans, runs, params, period, scope, edits]);
}
