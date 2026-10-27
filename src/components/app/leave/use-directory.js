"use client";

import { useMemo } from "react";
import { useCollection } from "@/lib/db";

/** Employee lookups (by id, position title, department name) memoised from the db slices. */
export function useDirectory() {
  const employees = useCollection("employees");
  const positions = useCollection("positions");
  const departments = useCollection("departments");
  return useMemo(() => {
    const byId = Object.fromEntries(employees.map((e) => [e.id, e]));
    const pos = Object.fromEntries(positions.map((p) => [p.id, p.title]));
    const dep = Object.fromEntries(departments.map((d) => [d.id, d.name]));
    return {
      employees,
      departments,
      byId,
      position: (e) => (e ? pos[e.positionId] ?? "" : ""),
      department: (e) => (e ? dep[e.departmentId] ?? "" : ""),
    };
  }, [employees, positions, departments]);
}
