"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { duration, spring } from "@/lib/motion-tokens";
import { shell, useShell } from "@/components/layout/shell-ui";
import AssistantChat from "./AssistantChat";

/** Right-hand slide-over, opened from the top bar or the palette. Hidden on /app/assistant (page has the same chat). */
export default function AssistantPanel() {
  const open = useShell((s) => s.assistant);
  const pathname = usePathname();
  const visible = open && !pathname.startsWith("/app/assistant");

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => e.key === "Escape" && shell.closeAssistant();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-overlay backdrop-blur-[3px] md:bg-transparent md:backdrop-blur-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base }}
            onClick={shell.closeAssistant}
          />
          <motion.aside
            role="dialog"
            aria-label="Assistant SIRH"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={spring.soft}
            className="absolute inset-y-0 end-0 flex w-[30em] max-w-full flex-col border-s border-border bg-surface shadow-lg"
          >
            <header className="flex shrink-0 items-center justify-between gap-[0.5em] border-b border-border-subtle px-[1em] py-[0.7em]">
              <h2 className="text-h3 font-semibold text-fg">Assistant SIRH</h2>
              <div className="flex items-center gap-[0.2em]">
                <Button variant="ghost" size="icon" href="/app/assistant" aria-label="Ouvrir en pleine page" title="Pleine page" onClick={shell.closeAssistant}>
                  <Maximize2 className="size-[1.1em]" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Fermer l'assistant" onClick={shell.closeAssistant}>
                  <X className="size-[1.2em]" />
                </Button>
              </div>
            </header>
            <AssistantChat className="flex-1" onNavigate={shell.closeAssistant} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
