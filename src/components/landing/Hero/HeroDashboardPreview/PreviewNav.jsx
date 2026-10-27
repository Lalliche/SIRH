import { Wallet, CalendarDays, Fingerprint, Users, FolderOpen, LayoutDashboard, FileCheck2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

// Sidebar mirroring the real app's modules (content/nav.js). The 3 live entries swap the content panel;
// the rest are pixel-faithful but inert, so the frame reads as the real product, not a 3-tab toy.
const GROUPS = [
  {
    label: "Accueil",
    items: [
      { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { key: "inbox", label: "Approbations", icon: Inbox, badge: "6" },
    ],
  },
  {
    label: "Paie",
    items: [
      { key: "paie", label: "Paie", icon: Wallet, live: true },
      { key: "declarations", label: "Déclarations", icon: FileCheck2 },
    ],
  },
  {
    label: "Temps",
    items: [
      { key: "conges", label: "Congés & absences", icon: CalendarDays, live: true },
      { key: "pointage", label: "Pointage", icon: Fingerprint, live: true },
    ],
  },
  {
    label: "Personnes",
    items: [
      { key: "employes", label: "Employés", icon: Users },
      { key: "documents", label: "Documents", icon: FolderOpen },
    ],
  },
];

export default function PreviewNav({ tab, onSelect }) {
  return (
    <nav aria-label="Modules (aperçu)" className="hidden w-[12.5em] shrink-0 flex-col gap-[0.9em] px-[0.7em] py-[0.9em] lg:flex">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-[0.15em]">
          <p className="px-[0.5em] pb-[0.25em] text-[0.58em] font-semibold uppercase tracking-[0.1em] text-fg-faint">{group.label}</p>
          {group.items.map((item) => {
            const active = item.key === tab;
            return (
              <button
                key={item.key}
                type="button"
                disabled={!item.live}
                aria-current={active || undefined}
                onClick={() => item.live && onSelect(item.key)}
                className={cn(
                  "relative flex items-center gap-[0.55em] rounded-md px-[0.5em] py-[0.38em] text-[0.72em] transition-colors duration-150",
                  active
                    ? "bg-primary-soft font-semibold text-link"
                    : item.live
                      ? "text-fg-secondary hover:bg-surface-hover hover:text-fg"
                      : "cursor-default text-fg-muted",
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-[0.3em] start-0 w-[2px] rounded-full bg-primary" />}
                <item.icon className="size-[1.05em] shrink-0" aria-hidden strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="num ms-auto rounded-full bg-neutral-bg px-[0.45em] text-[0.85em] font-medium text-neutral-fg">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
