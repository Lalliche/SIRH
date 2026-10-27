"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion-tokens";
import { Button } from "@/components/ui";

/**
 * Anchored popover / menu.
 *   <Popover trigger={(p, open) => <Button {...p}>…</Button>} panelClassName="w-[20em]">{(close) => …}</Popover>
 * `p` carries ref, onClick, onKeyDown, aria-expanded, aria-haspopup, aria-controls; 2nd arg = open.
 */
export function Popover({ trigger, children, align = "end", placement = "bottom", role = "menu", panelClassName, className }) {
  const [open, setOpen] = useState(false);
  const [byKeyboard, setByKeyboard] = useState(false);
  const root = useRef(null);
  const panel = useRef(null);
  const id = useId();
  const triggerId = `${id}-trigger`;

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) document.getElementById(triggerId)?.focus();
  }, [triggerId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && byKeyboard) panel.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
  }, [open, byKeyboard]);

  const items = () => Array.from(panel.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? []);
  const focusItem = (i) => {
    const list = items();
    if (list.length) list[(i + list.length) % list.length].focus();
  };

  const onPanelKey = (e) => {
    if (role !== "menu") return;
    const list = items();
    const at = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") (e.preventDefault(), focusItem(at + 1));
    if (e.key === "ArrowUp") (e.preventDefault(), focusItem(at < 0 ? -1 : at - 1));
    if (e.key === "Home") (e.preventDefault(), focusItem(0));
    if (e.key === "End") (e.preventDefault(), focusItem(-1));
    if (e.key === "Tab") setOpen(false);
  };

  const triggerProps = {
    id: triggerId,
    "aria-expanded": open,
    "aria-haspopup": role,
    "aria-controls": open ? id : undefined,
    onClick: (e) => {
      setByKeyboard(e.detail === 0);
      setOpen((o) => !o);
    },
    onKeyDown: (e) => {
      if (e.key === "ArrowDown" && !open) {
        e.preventDefault();
        setByKeyboard(true);
        setOpen(true);
      }
    },
  };

  const origin = placement === "top" ? "bottom-full mb-[0.4em]" : "top-full mt-[0.4em]";
  return (
    <div ref={root} className={cn("relative", className)}>
      {trigger(triggerProps, open)}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id={id}
            role={role}
            onKeyDown={onPanelKey}
            initial={{ opacity: 0, y: placement === "top" ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === "top" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: duration.fast + 0.04, ease: ease.out }}
            className={cn(
              "absolute z-50 max-w-[calc(100vw-1.5em)] overflow-hidden rounded-lg border border-border bg-surface shadow-lg",
              origin,
              align === "end" ? "end-0" : "start-0",
              panelClassName,
            )}
          >
            {typeof children === "function" ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Menu row built on the kit Button so it keeps hover / focus / active states. */
export function MenuItem({ icon, children, selected = false, danger = false, className, ...props }) {
  return (
    <Button
      variant="ghost"
      role="menuitem"
      icon={icon}
      className={cn(
        "!h-auto w-full !justify-start whitespace-normal py-[0.55em] text-start font-normal text-fg",
        selected && "bg-primary-soft text-link",
        danger && "text-danger-fg hover:bg-danger-bg hover:text-danger-fg",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function MenuLabel({ children }) {
  return <p className="px-[0.9em] pb-[0.3em] pt-[0.7em] text-[0.6875em] font-semibold uppercase tracking-[0.06em] text-fg-muted">{children}</p>;
}
