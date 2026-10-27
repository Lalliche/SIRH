// Who can a given role see/act on? Shared by leave, attendance, inbox, requests, loans.
import { isActiveEmployee } from "./leave-utils";

export const APPROVER_ROLES = ["admin", "hr", "manager"];
export const canApprove = (role) => APPROVER_ROLES.includes(role);

/** Employees visible to the user: admin/hr/accountant = everyone, manager = direct reports + self, employee = self. */
export function visibleEmployees(role, meId, employees) {
  if (role === "admin" || role === "hr" || role === "accountant") return employees;
  if (role === "manager") return employees.filter((e) => e.managerId === meId || e.id === meId);
  return employees.filter((e) => e.id === meId);
}

/** Employees whose requests the user may decide on (never oneself). */
export function approvableEmployees(role, meId, employees) {
  if (!canApprove(role)) return [];
  const list = role === "manager" ? employees.filter((e) => e.managerId === meId) : employees;
  return list.filter((e) => e.id !== meId);
}

export const activeOnly = (list) => list.filter(isActiveEmployee);
