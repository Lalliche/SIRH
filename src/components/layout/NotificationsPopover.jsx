"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { Popover, MenuItem } from "./Popover";
import { notificationIcon, relativeDay, useRoleNotifications } from "./shell-utils";

export function markAllRead(items) {
  items.filter((n) => !n.read).forEach((n) => db.patch("notifications", n.id, { read: true }));
}

export function NotificationsPopover() {
  const router = useRouter();
  const { items, unread } = useRoleNotifications();
  const shown = items.slice(0, 5);

  return (
    <Popover
      panelClassName="w-[24em]"
      trigger={(p) => (
        <Button variant="ghost" size="icon" className="relative max-md:size-[2.6em]" aria-label={unread ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"} {...p}>
          <Bell className="size-[1.25em]" strokeWidth={1.6} />
          {unread > 0 && (
            <span aria-hidden className="absolute end-[0.15em] top-[0.15em] flex h-[1.25em] min-w-[1.25em] items-center justify-center rounded-full bg-primary px-[0.25em] text-[0.625em] font-semibold text-primary-fg ring-2 ring-bg">
              {unread}
            </span>
          )}
        </Button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between gap-[0.5em] border-b border-border-subtle px-[0.9em] py-[0.7em]">
            <p className="font-semibold text-fg">Notifications</p>
            <Button variant="ghost" size="sm" icon={CheckCheck} disabled={!unread} onClick={() => markAllRead(items)}>
              Tout marquer comme lu
            </Button>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={Bell} title="Rien de nouveau" description="Les alertes de paie, de congés et de conformité apparaîtront ici." className="!py-[1.5em]" />
          ) : (
            <ul className="max-h-[22em] overflow-y-auto p-[0.35em]">
              {shown.map((n) => {
                const Icon = notificationIcon(n.href);
                return (
                  <li key={n.id}>
                    <MenuItem
                      className="items-start gap-[0.7em]"
                      onClick={() => {
                        if (!n.read) db.patch("notifications", n.id, { read: true });
                        close(false);
                        if (n.href) router.push(n.href);
                      }}
                    >
                      <span className={cn("mt-[0.15em] flex size-[2em] shrink-0 items-center justify-center rounded-md", n.read ? "bg-bg-sunken text-fg-muted" : "bg-primary-soft text-link")}>
                        <Icon className="size-[1.05em]" strokeWidth={1.7} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[0.875em] leading-snug", n.read ? "font-normal text-fg-secondary" : "font-semibold text-fg")}>{n.title}</span>
                        <span className="mt-[0.1em] block text-xs text-fg-muted">{n.body}</span>
                        <span className="mt-[0.2em] block text-xs text-fg-faint">{relativeDay(n.date)}{n.read ? "" : " · Non lue"}</span>
                      </span>
                      {!n.read && <span aria-hidden className="mt-[0.5em] size-[0.55em] shrink-0 rounded-full bg-primary" />}
                    </MenuItem>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-border-subtle p-[0.35em]">
            <MenuItem href="/app/notifications" onClick={() => close(false)} className="justify-center font-medium text-link">
              Voir toutes les notifications
            </MenuItem>
          </div>
        </div>
      )}
    </Popover>
  );
}
