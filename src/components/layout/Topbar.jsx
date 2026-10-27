"use client";

import { Menu, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import Logo from "./Logo";
import { shell } from "./shell-ui";
import { EntitySwitcher } from "./EntitySwitcher";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsPopover } from "./NotificationsPopover";
import { UserMenu } from "./UserMenu";

/** 56px top bar: entity switcher · ⌘K search · assistant · view-as · theme · notifications · account. */
export default function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-[3.5em] shrink-0 items-center gap-[0.4em] border-b border-border bg-bg/85 px-[0.75em] backdrop-blur-md md:gap-[0.75em] md:px-[2em]">
      <Button variant="ghost" size="icon" className="md:hidden max-md:size-[2.6em]" aria-label="Ouvrir le menu" onClick={shell.openNav}>
        <Menu className="size-[1.3em]" strokeWidth={1.6} />
      </Button>
      <Logo compact className="md:hidden" />

      <div className="hidden md:block">
        <EntitySwitcher />
      </div>

      <div className="flex min-w-0 flex-1 justify-end md:justify-center">
        <Button
          variant="secondary"
          onClick={shell.openPalette}
          aria-label="Rechercher ou ouvrir la palette de commandes"
          aria-keyshortcuts="Control+K Meta+K"
          className="max-md:size-[2.6em] max-md:!px-0 md:w-full md:max-w-[30em] md:!justify-start md:text-fg-muted"
        >
          <Search className="size-[1.2em]" strokeWidth={1.7} aria-hidden />
          <span className="hidden flex-1 truncate text-start font-normal md:inline">Rechercher un employé, une page, une action…</span>
          <kbd className="hidden rounded-xs border border-border bg-bg-sunken px-[0.45em] py-[0.05em] font-sans text-xs font-medium text-fg-muted md:inline">⌘K</kbd>
        </Button>
      </div>

      <div className="flex items-center gap-[0.15em] md:gap-[0.4em]">
        <Button variant="ghost" size="icon" className="max-md:size-[2.6em]" aria-label="Ouvrir l'assistant IA" title="Assistant IA" onClick={() => shell.openAssistant()}>
          <Sparkles className="size-[1.25em]" strokeWidth={1.6} />
        </Button>
        <div className="hidden md:block">
          <RoleSwitcher />
        </div>
        <ThemeToggle className="max-sm:hidden" />
        <NotificationsPopover />
        <UserMenu />
      </div>
    </header>
  );
}
