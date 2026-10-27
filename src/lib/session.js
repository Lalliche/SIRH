"use client";

import { useSyncExternalStore } from "react";
import { PERSONAS } from "@/data/constants";

// Session = cookie `sirh_session` ({ role, employeeId }). Read by proxy.js to gate /app.
// Prototype only — no real authentication.

const COOKIE = "sirh_session";
const listeners = new Set();
let cache = { raw: null, value: null };

function readCookie() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  const raw = m ? m.slice(COOKIE.length + 1) : null;
  if (raw === cache.raw) return cache.value;
  let value = null;
  try {
    value = raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {}
  cache = { raw, value };
  return value;
}

export function setSession(role) {
  const persona = PERSONAS.find((p) => p.role === role) ?? PERSONAS[0];
  const value = encodeURIComponent(JSON.stringify({ role: persona.role, employeeId: persona.employeeId }));
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  listeners.forEach((l) => l());
}

export function clearSession() {
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** { role, employeeId } | null — null on the server and before hydration */
export function useSession() {
  return useSyncExternalStore(subscribe, readCookie, () => null);
}

// Capability map — which roles can open which area
const ACCESS = {
  employees: ["admin", "hr", "manager", "accountant"],
  payroll: ["admin", "hr", "accountant"],
  recruitment: ["admin", "hr", "manager"],
  compliance: ["admin", "hr", "accountant"],
  reports: ["admin", "hr", "accountant"],
  settings: ["admin", "hr"],
  inbox: ["admin", "hr", "manager"],
  attendanceAdmin: ["admin", "hr", "manager"],
  salaries: ["admin", "hr", "accountant"],
};
export const can = (role, area) => (ACCESS[area] ?? []).includes(role);
