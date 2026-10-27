"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, Fingerprint } from "lucide-react";
import { Tabs } from "@/components/ui";

const TABS = [
  { value: "/app/attendance", label: "Aujourd'hui", icon: Fingerprint },
  { value: "/app/attendance/timesheets", label: "Feuilles de temps", icon: CalendarRange },
];

export default function AttendanceNav() {
  const pathname = usePathname();
  const router = useRouter();
  return <Tabs tabs={TABS} value={pathname.replace(/\/$/, "").endsWith("timesheets") ? TABS[1].value : TABS[0].value} onChange={(v) => router.push(v)} className="mb-[1.5em]" />;
}
