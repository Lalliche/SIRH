"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, spring } from "@/lib/motion-tokens";
import Button from "./Button";

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/** Centered dialog. size: sm (confirm) | md (form) | lg */
export function Modal({ open, onClose, title, description, size = "md", footer, children }) {
  useEscape(open, onClose);
  const width = { sm: "max-w-[32em]", md: "max-w-[40em]", lg: "max-w-[56em]" }[size];
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-[1em] text-[16px]">
            <motion.div
              className="absolute inset-0 bg-overlay backdrop-blur-[6px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.base }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: duration.panel, ease: ease.out }}
              className={cn("relative flex max-h-[90vh] w-full flex-col rounded-xl border border-border bg-surface shadow-lg", width)}
            >
              <header className="flex items-start justify-between gap-[1em] border-b border-border-subtle px-[1.5em] py-[1.1em]">
                <div>
                  <h2 className="text-h2 font-semibold text-fg">{title}</h2>
                  {description && <p className="mt-[0.2em] text-sm text-fg-muted">{description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer"><X className="size-[1.2em]" /></Button>
              </header>
              <div className="overflow-y-auto px-[1.5em] py-[1.25em]">{children}</div>
              {footer && <footer className="flex justify-end gap-[0.6em] border-t border-border-subtle px-[1.5em] py-[1em]">{footer}</footer>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Side drawer from the right edge (record detail, approvals). */
export function Drawer({ open, onClose, title, description, footer, width = "30em", children }) {
  useEscape(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] text-[16px]">
            <motion.div
              className="absolute inset-0 bg-overlay backdrop-blur-[4px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.base }}
              onClick={onClose}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={title}
              style={{ width }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={spring.soft}
              className="absolute inset-y-0 end-0 flex max-w-full flex-col border-s border-border bg-surface shadow-lg"
            >
              <header className="flex items-start justify-between gap-[1em] border-b border-border-subtle px-[1.5em] py-[1.1em]">
                <div className="min-w-0">
                  <h2 className="text-h2 font-semibold text-fg">{title}</h2>
                  {description && <p className="mt-[0.2em] text-sm text-fg-muted">{description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer"><X className="size-[1.2em]" /></Button>
              </header>
              <div className="flex-1 overflow-y-auto px-[1.5em] py-[1.25em]">{children}</div>
              {footer && <footer className="flex justify-end gap-[0.6em] border-t border-border-subtle px-[1.5em] py-[1em]">{footer}</footer>}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirmer", danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant={danger ? "danger-solid" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-fg-secondary">{description}</p>
    </Modal>
  );
}
