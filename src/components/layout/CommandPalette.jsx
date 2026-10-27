"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, SearchX } from "lucide-react";
import { Avatar, SearchInput, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion-tokens";
import { db, useCollection } from "@/lib/db";
import { useCurrentUser } from "@/lib/use-current-user";
import { buildCommands, loadRecents, pushRecent, searchCommands } from "@/lib/commands";
import { shell, useShell } from "./shell-ui";
import { setTheme } from "./theme";

function Row({ item, index, active, onHover, onRun }) {
  const Icon = item.icon;
  return (
    <div
      role="option"
      id={`cmd-${index}`}
      aria-selected={active}
      onMouseMove={() => !active && onHover(index)}
      onClick={() => onRun(item)}
      className={cn("relative flex cursor-pointer items-center gap-[0.75em] rounded-md px-[0.7em] py-[0.5em] transition-colors duration-100", active ? "bg-primary-soft" : "hover:bg-surface-hover")}
    >
      {active && <span aria-hidden className="absolute inset-y-[0.4em] start-0 w-[2px] rounded-full bg-primary" />}
      {item.employee ? (
        <Avatar employee={item.employee} size="sm" />
      ) : (
        <span className={cn("flex size-[2em] shrink-0 items-center justify-center rounded-md", active ? "bg-surface text-link" : "bg-bg-sunken text-fg-secondary")}>
          {Icon && <Icon className="size-[1.05em]" strokeWidth={1.7} aria-hidden />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[0.9375em] font-medium", active ? "text-link" : "text-fg")}>{item.label}</span>
        {item.hint && <span className="block truncate text-xs text-fg-muted">{item.hint}</span>}
      </span>
      {active && <CornerDownLeft className="size-[1.05em] shrink-0 text-fg-muted" aria-hidden />}
    </div>
  );
}

function PaletteInner() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, employeeId } = useCurrentUser();
  const employees = useCollection("employees");
  const positions = useCollection("positions");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recents] = useState(loadRecents);

  const commands = useMemo(() => buildCommands({ role, employees, positions, myId: employeeId }), [role, employees, positions, employeeId]);
  const { groups, flat } = useMemo(
    () => searchCommands(query, { commands, role, employees, positions, recents, pathname }),
    [query, commands, role, employees, positions, recents, pathname],
  );
  const onlyAi = query.trim() && flat.every((f) => f.group === "ai");

  const run = (item) => {
    pushRecent(item.id);
    shell.closePalette();
    if (item.action === "reset") {
      db.reset();
      toast.success("Données de démonstration réinitialisées.");
    } else if (item.action === "theme") {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    } else if (item.action === "assistant") {
      shell.openAssistant(item.question, { panel: !pathname.startsWith("/app/assistant") });
    } else if (item.href) {
      router.push(item.href);
    }
  };

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && shell.closePalette();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e) => {
    const n = flat.length;
    if (!n) return;
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => (a + 1) % n));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => (a - 1 + n) % n));
    else if (e.key === "Home") (e.preventDefault(), setActive(0));
    else if (e.key === "End") (e.preventDefault(), setActive(n - 1));
    else if (e.key === "Enter") (e.preventDefault(), flat[active] && run(flat[active]));
    else if (e.key === "Tab") e.preventDefault();
  };

  const indexed = groups.map((g, gi) => {
    const start = groups.slice(0, gi).reduce((n, x) => n + x.items.length, 0);
    return { ...g, items: g.items.map((item, i) => ({ item, index: start + i })) };
  });
  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-[0.75em] pt-[8vh] md:pt-[13vh]">
      <motion.div
        className="absolute inset-0 bg-overlay backdrop-blur-[6px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.base }}
        onClick={shell.closePalette}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: duration.base, ease: ease.out }}
        className="relative flex max-h-[min(36em,78dvh)] w-full max-w-[40em] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
      >
        <div className="flex items-center gap-[0.6em] border-b border-border-subtle p-[0.75em]">
          <SearchInput
            className="flex-1"
            placeholder="Rechercher un employé, une page, une action…"
            value={query}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={flat.length ? `cmd-${active}` : undefined}
            onChange={(v) => {
              setQuery(v);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="hidden rounded-xs border border-border bg-bg-sunken px-[0.45em] py-[0.1em] font-sans text-xs text-fg-muted sm:inline">Échap</kbd>
        </div>

        <div id="cmdk-list" role="listbox" aria-label="Résultats" className="min-h-0 flex-1 overflow-y-auto p-[0.4em]">
          {onlyAi && (
            <div className="flex items-start gap-[0.7em] px-[0.8em] py-[0.8em] text-sm text-fg-secondary">
              <SearchX className="mt-[0.15em] size-[1.2em] shrink-0 text-fg-muted" aria-hidden />
              <p>Aucun résultat pour « {query.trim()} ». Essayez « attestation », « IRG » ou interrogez l&apos;assistant.</p>
            </div>
          )}
          {indexed.map((g) => (
            <div key={g.key} role="group" aria-label={g.label} className="pb-[0.3em]">
              <p className="px-[0.8em] pb-[0.25em] pt-[0.6em] text-[0.6875em] font-semibold uppercase tracking-[0.06em] text-fg-muted">{g.label}</p>
              {g.items.map(({ item, index }) => (
                <Row key={item.id} item={item} index={index} active={index === active} onHover={setActive} onRun={run} />
              ))}
            </div>
          ))}
        </div>

        <footer className="flex flex-wrap items-center gap-x-[1.1em] gap-y-[0.25em] border-t border-border-subtle bg-surface-2 px-[1em] py-[0.6em] text-xs text-fg-muted">
          <span><kbd className="font-sans font-semibold">↑↓</kbd> naviguer</span>
          <span><kbd className="font-sans font-semibold">↵</kbd> ouvrir</span>
          <span><kbd className="font-sans font-semibold">Échap</kbd> fermer</span>
          <span className="ms-auto hidden sm:inline">Essayez « congé Sofiane », « attestation Nadia » ou « bulletin septembre »</span>
        </footer>
      </motion.div>
    </div>
  );
}

/** ⌘K / Ctrl+K command palette: registry in src/lib/commands.js. */
export default function CommandPalette() {
  const open = useShell((s) => s.palette);
  return <AnimatePresence>{open && <PaletteInner key="palette" />}</AnimatePresence>;
}
