"use client";

import CompanySettings from "./CompanySettings";
import UsersSettings from "./UsersSettings";
import CalendarSettings from "./CalendarSettings";
import PayrollSettings from "./PayrollSettings";
import WorkflowSettings from "./WorkflowSettings";
import NotificationSettings from "./NotificationSettings";
import AuditLog from "./AuditLog";
import DataSettings from "./DataSettings";
import { useCurrentUser } from "@/lib/use-current-user";

const MAP = {
  company: CompanySettings,
  users: UsersSettings,
  calendar: CalendarSettings,
  payroll: PayrollSettings,
  workflows: WorkflowSettings,
  notifications: NotificationSettings,
  "audit-log": AuditLog,
  data: DataSettings,
};

export default function SettingsSection({ section }) {
  const user = useCurrentUser();
  const Component = MAP[section];
  return <Component user={user} />;
}
