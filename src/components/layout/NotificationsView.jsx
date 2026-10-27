"use client";

import { useMemo, useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { markAllRead } from "./NotificationsPopover";
import { notificationIcon, relativeDay, useRoleNotifications } from "./shell-utils";

export default function NotificationsView() {
  const { items, unread } = useRoleNotifications();
  const [filter, setFilter] = useState("all");
  const shown = useMemo(() => items.filter((n) => (filter === "unread" ? !n.read : filter === "read" ? n.read : true)), [items, filter]);

  return (
    <>
      <PageHeader
        eyebrow="Compte"
        title="Notifications"
        description="Alertes de paie, de congés, de conformité et messages qui vous concernent."
        actions={<Button variant="secondary" icon={CheckCheck} disabled={!unread} onClick={() => markAllRead(items)}>Tout marquer comme lu</Button>}
      />
      <Tabs
        className="mb-[1.25em]"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: "all", label: "Toutes", count: items.length },
          { value: "unread", label: "Non lues", count: unread },
          { value: "read", label: "Lues", count: items.length - unread },
        ]}
      />
      <Card padded={false}>
        {shown.length === 0 ? (
          <EmptyState
            icon={filter === "unread" ? CheckCheck : BellOff}
            title={filter === "unread" ? "Tout est à jour" : "Aucune notification"}
            description={filter === "unread" ? "Vous avez lu toutes vos notifications." : "Les prochaines alertes apparaîtront ici."}
            secondary={filter !== "all" ? <Button variant="ghost" onClick={() => setFilter("all")}>Effacer le filtre</Button> : null}
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {shown.map((n) => {
              const Icon = notificationIcon(n.href);
              return (
                <li key={n.id} className={cn("flex flex-wrap items-start gap-[0.9em] px-[1.25em] py-[1em] transition-colors duration-150 hover:bg-surface-hover", !n.read && "bg-primary-soft/40")}>
                  <span className={cn("flex size-[2.4em] shrink-0 items-center justify-center rounded-md", n.read ? "bg-bg-sunken text-fg-muted" : "bg-primary-soft text-link")}>
                    <Icon className="size-[1.15em]" strokeWidth={1.7} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 basis-[14em]">
                    <div className="flex flex-wrap items-center gap-[0.5em]">
                      <p className={cn("text-fg", n.read ? "font-medium" : "font-semibold")}>{n.title}</p>
                      {!n.read && <Badge tone="brand">Non lue</Badge>}
                    </div>
                    <p className="mt-[0.15em] text-sm text-fg-secondary">{n.body}</p>
                    <p className="mt-[0.3em] text-xs text-fg-muted">{relativeDay(n.date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-[0.4em]">
                    <Button variant="ghost" size="sm" onClick={() => db.patch("notifications", n.id, { read: !n.read })}>
                      {n.read ? "Marquer non lue" : "Marquer comme lue"}
                    </Button>
                    {n.href && (
                      <Button variant="soft" size="sm" href={n.href} onClick={() => !n.read && db.patch("notifications", n.id, { read: true })}>
                        Ouvrir
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-[1em] flex items-center gap-[0.4em] text-xs text-fg-muted"><Bell className="size-[1em]" aria-hidden />Les notifications sont filtrées selon votre rôle.</p>
    </>
  );
}
