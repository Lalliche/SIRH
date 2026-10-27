"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui";
import { useCurrentUser } from "@/lib/use-current-user";
import AssistantPanel from "@/components/assistant/AssistantPanel";
import Sidebar, { MobileNav } from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "./CommandPalette";
import PageTransition from "./PageTransition";
import AccessDenied from "./AccessDenied";
import { shell } from "./shell-ui";
import { routeAccess } from "./shell-utils";

const isTyping = (el) => el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

/** Back-office shell: sidebar, top bar, palette, assistant panel, toasts. */
export default function AppShell({ children }) {
  const pathname = usePathname();
  const { role } = useCurrentUser();
  const { item, allowed } = routeAccess(pathname, role);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        shell.togglePalette();
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        shell.openPalette();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh bg-bg">
      <a href="#contenu" className="sr-only rounded-md bg-surface px-[1em] py-[0.6em] text-fg shadow-md focus:not-sr-only focus:fixed focus:start-[1em] focus:top-[1em] focus:z-[100]">
        Aller au contenu
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-[90em] flex-1 p-[1em] pb-[max(1em,env(safe-area-inset-bottom))] outline-none md:p-[2em]">
          <PageTransition>{allowed ? children : <AccessDenied item={item} role={role} />}</PageTransition>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <AssistantPanel />
      <Toaster />
    </div>
  );
}
