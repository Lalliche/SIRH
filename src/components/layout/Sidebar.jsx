"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Building2, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { duration, ease, spring } from "@/lib/motion-tokens";
import { useDb } from "@/lib/db";
import { useCurrentUser } from "@/lib/use-current-user";
import Logo from "./Logo";
import { shell, useShell } from "./shell-ui";
import { matchNavItem, useNavCounts, visibleNav } from "./shell-utils";
import { EntitySwitcher } from "./EntitySwitcher";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const TIP_DELAY = 300;

function NavItem({ item, active, collapsed, count, layoutKey, onNavigate, tip }) {
  const Icon = item.icon;
  const label = count ? `${item.label} (${count} en attente)` : item.label;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      onMouseEnter={(e) => collapsed && tip.show(e.currentTarget, label)}
      onMouseLeave={tip.hide}
      onFocus={(e) => collapsed && e.currentTarget.matches(":focus-visible") && tip.show(e.currentTarget, label, 0)}
      onBlur={tip.hide}
      className={cn(
        "group relative flex h-[2.25em] items-center rounded-md text-fg-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-fg active:scale-[0.99]",
        collapsed ? "justify-center" : "gap-[0.75em] px-[0.7em]",
        active && "text-link hover:bg-transparent hover:text-link",
      )}
    >
      {active && (
        <motion.span layoutId={`nav-active-${layoutKey}`} transition={spring.snappy} className="absolute inset-0 rounded-md bg-primary-soft">
          <span className="absolute inset-y-[0.45em] start-0 w-[2px] rounded-full bg-primary" />
        </motion.span>
      )}
      <Icon className="relative size-[1.2em] shrink-0" strokeWidth={1.7} aria-hidden />
      {!collapsed && <span className="relative min-w-0 flex-1 truncate text-[0.875em] font-medium">{item.label}</span>}
      {!collapsed && count > 0 && (
        <span className="relative min-w-[1.6em] rounded-full bg-neutral-bg px-[0.5em] text-center text-xs font-semibold text-neutral-fg">{count}</span>
      )}
      {collapsed && count > 0 && (
        <span aria-hidden className="absolute end-[0.35em] top-[0.2em] flex h-[1.15em] min-w-[1.15em] items-center justify-center rounded-full bg-primary px-[0.2em] text-[0.625em] font-semibold text-primary-fg">
          {count}
        </span>
      )}
    </Link>
  );
}

/** Floating label for the icon rail (fixed so the scroll container cannot clip it). */
function useRailTip() {
  const [tip, setTip] = useState(null);
  const timer = useRef(null);
  const api = useMemo(
    () => ({
      show(el, label, delay = TIP_DELAY) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const r = el.getBoundingClientRect();
          setTip({ label, top: r.top + r.height / 2, left: r.right });
        }, delay);
      },
      hide() {
        clearTimeout(timer.current);
        setTip(null);
      },
    }),
    [],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return [tip, api];
}

export function SidebarContent({ collapsed = false, onNavigate, layoutKey = "d", drawer = false }) {
  const pathname = usePathname();
  const { role } = useCurrentUser();
  const counts = useNavCounts();
  const company = useDb((s) => s.company);
  const groups = visibleNav(role);
  const active = matchNavItem(pathname, groups.flatMap((g) => g.items));
  const [tip, tipApi] = useRailTip();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex h-[3.5em] shrink-0 items-center", collapsed ? "justify-center" : "justify-between px-[1.1em]")}>
        <Logo compact={collapsed} onClick={onNavigate} />
        {drawer && (
          <Button variant="ghost" size="icon" aria-label="Fermer le menu" onClick={shell.closeNav}>
            <X className="size-[1.2em]" />
          </Button>
        )}
      </div>

      <nav aria-label="Navigation principale" className={cn("min-h-0 flex-1 overflow-y-auto pb-[0.75em]", collapsed ? "px-[0.5em]" : "px-[0.75em]")} onScroll={tipApi.hide}>
        {groups.map((g, gi) => (
          <div key={g.label} className={cn(gi > 0 && "mt-[1.1em]")}>
            {collapsed ? (
              gi > 0 && <hr aria-hidden className="mx-auto mb-[0.7em] w-[1.5em] border-border" />
            ) : (
              <p className="px-[0.7em] pb-[0.35em] text-[0.6875em] font-semibold uppercase tracking-[0.07em] text-fg-muted">{g.label}</p>
            )}
            <ul className="flex flex-col gap-[0.15em]">
              {g.items.map((item) => (
                <li key={item.href}>
                  <NavItem item={item} active={active?.href === item.href} collapsed={collapsed} count={item.badge ? counts[item.badge] : 0} layoutKey={layoutKey} onNavigate={onNavigate} tip={tipApi} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {drawer && (
        <div className="flex shrink-0 flex-col gap-[0.5em] border-t border-border px-[0.75em] py-[0.75em]">
          <EntitySwitcher block placement="top" align="start" />
          <RoleSwitcher block placement="top" align="start" />
          <div className="flex items-center gap-[0.5em] text-sm text-fg-secondary">
            <ThemeToggle />
            <span>Apparence</span>
          </div>
        </div>
      )}

      <div className={cn("shrink-0 border-t border-border", collapsed ? "flex flex-col items-center gap-[0.5em] px-[0.5em] py-[0.75em]" : "space-y-[0.6em] px-[0.75em] py-[0.75em]")}>
        {collapsed ? (
          <span
            tabIndex={0}
            role="img"
            aria-label={`${company.name}, plan ${company.plan}`}
            onMouseEnter={(e) => tipApi.show(e.currentTarget, `${company.name} · plan ${company.plan}`)}
            onMouseLeave={tipApi.hide}
            className="flex size-[2.25em] items-center justify-center rounded-md border border-border bg-surface text-fg-secondary"
          >
            <Building2 className="size-[1.1em]" strokeWidth={1.7} aria-hidden />
          </span>
        ) : (
          <div className="rounded-lg border border-border bg-surface px-[0.8em] py-[0.65em]">
            <p className="truncate text-[0.8125em] font-semibold text-fg">{company.name}</p>
            <div className="mt-[0.35em] flex items-center justify-between gap-[0.5em]">
              <Badge tone="brand">Plan {company.plan}</Badge>
              <span className="text-xs text-fg-muted">Démo</span>
            </div>
          </div>
        )}
        {!drawer && (
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn(!collapsed && "w-full !justify-start text-fg-muted")}
            icon={collapsed ? undefined : PanelLeftClose}
            onClick={shell.toggleSidebar}
            aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
            aria-pressed={collapsed}
            onMouseEnter={(e) => collapsed && tipApi.show(e.currentTarget, "Développer le menu")}
            onMouseLeave={tipApi.hide}
          >
            {collapsed ? <PanelLeftOpen className="size-[1.2em]" /> : "Réduire le menu"}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {tip && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast, ease: ease.out }}
            style={{ top: tip.top, left: tip.left }}
            className="pointer-events-none fixed z-[70] ms-[0.6em] -translate-y-1/2 whitespace-nowrap rounded-sm bg-pine-900 px-[0.6em] py-[0.35em] text-xs font-medium text-white shadow-md"
          >
            {tip.label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Desktop sidebar: 248px, collapsible to a 64px rail. */
export default function Sidebar() {
  const collapsed = useShell((s) => s.collapsed);
  return (
    <aside
      aria-label="Menu latéral"
      className={cn("sticky top-0 hidden h-dvh shrink-0 border-e border-border bg-bg-sunken md:block", collapsed ? "w-[4em]" : "w-[15.5em]")}
    >
      <SidebarContent collapsed={collapsed} layoutKey="desktop" />
    </aside>
  );
}

/** Mobile drawer (< md). Slides from the start edge; closes on navigation and Esc. */
export function MobileNav() {
  const open = useShell((s) => s.mobileNav);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && shell.closeNav();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <motion.div
            className="absolute inset-0 bg-overlay backdrop-blur-[4px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base }}
            onClick={shell.closeNav}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={spring.soft}
            className="absolute inset-y-0 start-0 w-[min(19em,86vw)] border-e border-border bg-bg-sunken pb-[env(safe-area-inset-bottom)] shadow-lg"
          >
            <SidebarContent layoutKey="drawer" drawer onNavigate={shell.closeNav} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
