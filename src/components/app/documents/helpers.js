import { Building2, FileText, FolderLock, LayoutTemplate, ShieldCheck, Users } from "lucide-react";
import { TODAY } from "@/lib/clock";
import { diffDays } from "@/lib/dates";

export const FOLDERS = [
  { key: "Entreprise", icon: Building2, hint: "Règlement, politiques" },
  { key: "Dossiers salariés", icon: Users, hint: "Contrats, certificats" },
  { key: "Conformité", icon: ShieldCheck, hint: "Assurances, permis, PV" },
  { key: "Modèles", icon: LayoutTemplate, hint: "Modèles Word" },
];
export const ROOT_ICON = FolderLock;
export const KIND_ICON = { pdf: FileText, doc: FileText, xls: FileText };

export const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024; // plan Business: 5 Go
export const MAX_UPLOAD = 10 * 1024 * 1024;

/** Which documents a role can see. Employees: company docs + their own. */
export function scopeDocs(docs, user) {
  const { role, employeeId } = user;
  if (role === "admin" || role === "hr") return docs;
  return docs.filter((d) => {
    if (d.folder === "Entreprise") return true;
    if (d.ownerId === employeeId && d.folder !== "Modèles") return true;
    if (role === "manager" && d.folder === "Conformité") return true;
    return false;
  });
}
export const foldersFor = (role) => (role === "admin" || role === "hr" ? FOLDERS : FOLDERS.filter((f) => f.key !== "Modèles"));

export function expiryOf(d) {
  if (!d.expiresAt) return null;
  const days = diffDays(TODAY, d.expiresAt);
  return { days, state: days < 0 ? "expired" : days < 60 ? "soon" : "ok" };
}

export const kindOf = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xls";
  return "doc";
};
