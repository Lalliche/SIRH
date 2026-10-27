"use client";

import { useMemo } from "react";
import { useCollection } from "@/lib/db";
import { useSession } from "@/lib/session";

/** { role, employee, employeeId } — falls back to the admin persona before hydration. */
export function useCurrentUser() {
  const session = useSession();
  const employees = useCollection("employees");
  return useMemo(() => {
    const employeeId = session?.employeeId ?? "emp-001";
    const role = session?.role ?? "admin";
    return { role, employeeId, employee: employees.find((e) => e.id === employeeId) ?? null, ready: !!session };
  }, [session, employees]);
}
