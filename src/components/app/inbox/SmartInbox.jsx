"use client";

import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, CheckCheck, Lock, ShieldCheck, X } from "lucide-react";
import { Avatar, Badge, Button, Card, Checkbox, Drawer, EmptyState, PageHeader, Segmented } from "@/components/ui";
import LeaveContext from "@/components/app/leave/LeaveContext";
import ReasonModal from "@/components/app/leave/ReasonModal";
import { useCollection, useDb } from "@/lib/db";
import { fullName } from "@/lib/format";
import { can } from "@/lib/session";
import { useCurrentUser } from "@/lib/use-current-user";
import { spring } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { CorrectionContext, LoanContext, RequestContext } from "./contexts";
import { KIND_META, ageLabel, buildInboxItems } from "./inbox-items";
import { useDecisions } from "./use-decisions";
import { useMediaQuery } from "./use-media";
import { seedDemoCorrections } from "./use-pending";

const Kbd = ({ children }) => (
  <kbd className="inline-flex min-w-[1.5em] items-center justify-center rounded-xs border border-border-strong bg-surface-2 px-[0.35em] font-mono text-[0.75em] font-medium text-fg-secondary">{children}</kbd>
);

function ItemBody({ item }) {
  if (item.kind === "leave") return <LeaveContext request={item.raw} />;
  if (item.kind === "loan") return <LoanContext item={item} />;
  if (item.kind === "request") return <RequestContext item={item} />;
  return <CorrectionContext item={item} />;
}

function ItemHeader({ item }) {
  const Icon = KIND_META[item.kind].icon;
  return (
    <div className="flex flex-wrap items-center gap-[0.6em]">
      <Badge tone="brand" icon={Icon}>{KIND_META[item.kind].single}</Badge>
      <h2 className="min-w-0 flex-1 font-display text-h3 font-semibold text-fg">{item.title}</h2>
      <span className="text-xs text-fg-muted">{ageLabel(item.createdAt)}</span>
    </div>
  );
}

function Actions({ onApprove, onReject, safe }) {
  return (
    <div className="flex flex-wrap items-center gap-[0.6em]">
      <Button variant="danger" icon={X} onClick={onReject}>Refuser <Kbd>R</Kbd></Button>
      <Button icon={Check} onClick={onApprove}>Approuver <Kbd>A</Kbd></Button>
      <span className={cn("ms-auto inline-flex items-center gap-[0.4em] text-xs", safe ? "text-success-fg" : "text-warning-fg")}>
        {safe ? <ShieldCheck className="size-[1.2em]" aria-hidden /> : <AlertTriangle className="size-[1.2em]" aria-hidden />}
        {safe ? "Aucun conflit" : "À examiner avant d'approuver"}
      </span>
    </div>
  );
}

export default function SmartInbox() {
  const me = useCurrentUser();
  const employees = useCollection("employees");
  const leaveRequests = useCollection("leaveRequests");
  const requests = useCollection("requests");
  const loans = useCollection("loans");
  const attendance = useCollection("attendance");
  const settings = useDb((s) => s.settings);
  const run = useDecisions();
  const desktop = useMediaQuery("(min-width: 1150px)");

  useEffect(() => { seedDemoCorrections(); }, []);

  const items = useMemo(
    () => buildInboxItems({ employees, leaveRequests, requests, loans, attendance, settings }, me),
    [employees, leaveRequests, requests, loans, attendance, settings, me],
  );

  const [filter, setFilter] = useState("all");
  const [activeKey, setActiveKey] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [rejecting, setRejecting] = useState(null); // [{kind,id,key}]
  const [drawer, setDrawer] = useState(false);

  const visible = useMemo(() => (filter === "all" ? items : items.filter((i) => i.kind === filter)), [items, filter]);
  const active = visible.find((i) => i.key === activeKey) ?? visible[0] ?? null;
  const safeItems = visible.filter((i) => i.safe);
  const counts = useMemo(() => Object.fromEntries(Object.keys(KIND_META).map((k) => [k, items.filter((i) => i.kind === k).length])), [items]);
  const selectedItems = visible.filter((i) => selected.has(i.key));

  const entry = (i) => ({ kind: i.kind, id: i.id, key: i.key });
  const neighbour = (key) => {
    const idx = visible.findIndex((i) => i.key === key);
    return (visible[idx + 1] ?? visible[idx - 1])?.key ?? null;
  };
  const drop = (keys) => setSelected((s) => { const n = new Set(s); keys.forEach((k) => n.delete(k)); return n; });

  const approve = (list) => {
    if (!list.length) return;
    const next = list.some((i) => i.key === active?.key) ? neighbour(active.key) : activeKey;
    run(list.map(entry), "approve");
    drop(list.map((i) => i.key));
    setActiveKey(next);
    setDrawer(false);
  };
  const confirmReject = (reason) => {
    const list = rejecting;
    const next = list.some((i) => i.key === active?.key) ? neighbour(active.key) : activeKey;
    run(list.map(entry), "reject", reason);
    drop(list.map((i) => i.key));
    setActiveKey(next);
    setRejecting(null);
    setDrawer(false);
  };
  const move = (delta) => {
    if (!visible.length) return;
    const idx = Math.max(0, visible.findIndex((i) => i.key === active?.key));
    setActiveKey(visible[Math.min(visible.length - 1, Math.max(0, idx + delta))].key);
  };
  const toggle = (key) => setSelected((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectSafe = () => setSelected(new Set(safeItems.map((i) => i.key)));

  // Keyboard: J/K move, A approve, R reject, X select. Latest closures kept in a ref.
  const keys = useRef(null);
  useEffect(() => {
    keys.current = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || rejecting || !desktop) return;
      const t = e.target;
      if (t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "j" || (k === "arrowdown" && (t === document.body || t.closest?.("[role=listbox]")))) { e.preventDefault(); move(1); }
      else if (k === "k" || (k === "arrowup" && (t === document.body || t.closest?.("[role=listbox]")))) { e.preventDefault(); move(-1); }
      else if (k === "a" && active) { e.preventDefault(); approve([active]); }
      else if (k === "r" && active) { e.preventDefault(); setRejecting([active]); }
      else if (k === "x" && active) { e.preventDefault(); toggle(active.key); }
      else if (k === "escape" && selected.size) setSelected(new Set());
    };
  });
  useEffect(() => {
    const fn = (e) => keys.current?.(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    if (active) document.getElementById(`inbox-${active.key}`)?.scrollIntoView({ block: "nearest" });
  }, [active?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me.ready) return <PageSkeleton />;

  if (!can(me.role, "inbox")) {
    return (
      <>
        <PageHeader title="Approbations" />
        <EmptyState icon={Lock} title="Accès réservé aux responsables" description="Vos demandes et leur avancement sont dans « Demandes »." action={<Button href="/app/requests">Voir mes demandes</Button>} />
      </>
    );
  }

  const allSelected = visible.length > 0 && selectedItems.length === visible.length;

  return (
    <>
      <PageHeader
        title="Approbations"
        description={items.length ? `${items.length} demande${items.length > 1 ? "s" : ""} en attente${me.role === "manager" ? " dans votre équipe" : ""}, dont ${items.filter((i) => i.safe).length} sans conflit.` : "Congés, avances, demandes et corrections de pointage, dans une seule file."}
      />

      {items.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={CheckCheck} title="Tout est à jour" description="Aucune demande n'attend votre décision. Les prochaines demandes de congé, d'avance ou de correction apparaîtront ici." action={<Button variant="secondary" href="/app/leave/calendar">Voir le calendrier d’équipe</Button>} />
        </Card>
      ) : (
        <div className="grid items-start gap-[1.25em] lg:grid-cols-[minmax(0,27em)_minmax(0,1fr)]">
          <section aria-label="File d'approbation" className="flex min-w-0 flex-col gap-[0.8em]">
            <div className="overflow-x-auto pb-[0.2em]">
              <Segmented
                size="sm"
                className="w-max"
                value={filter}
                onChange={(v) => { setFilter(v); setSelected(new Set()); }}
                options={[{ value: "all", label: `Tout · ${items.length}` }, ...Object.entries(KIND_META).filter(([k]) => counts[k]).map(([k, m]) => ({ value: k, label: `${m.label} · ${counts[k]}` }))]}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-[0.6em]">
              <Checkbox checked={allSelected} onChange={(on) => setSelected(on ? new Set(visible.map((i) => i.key)) : new Set())} label="Tout sélectionner" />
              <Button size="sm" variant="soft" icon={ShieldCheck} disabled={!safeItems.length} onClick={selectSafe}>Approuver les demandes sûres ({safeItems.length})</Button>
            </div>

            {visible.length === 0 ? (
              <Card padded={false}><EmptyState title="Rien dans cette catégorie" description="Toutes ces demandes sont traitées." action={<Button variant="secondary" onClick={() => setFilter("all")}>Tout afficher</Button>} /></Card>
            ) : (
              <ul role="listbox" aria-label="Demandes en attente" aria-activedescendant={active ? `inbox-${active.key}` : undefined} className="flex flex-col gap-[0.5em]">
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map((i) => {
                    const isActive = active?.key === i.key;
                    const Icon = KIND_META[i.kind].icon;
                    return (
                      <motion.li
                        key={i.key}
                        id={`inbox-${i.key}`}
                        layout="position"
                        role="option"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -28 }}
                        transition={spring.snappy}
                        onClick={() => { setActiveKey(i.key); if (!desktop) setDrawer(true); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveKey(i.key); if (!desktop) setDrawer(true); } }}
                        className={cn(
                          "relative flex cursor-pointer items-start gap-[0.75em] rounded-lg border px-[0.9em] py-[0.8em] transition-colors duration-100",
                          isActive ? "border-pine-200 bg-primary-soft" : "border-border bg-surface hover:bg-surface-hover",
                        )}
                      >
                        {isActive && <span aria-hidden className="absolute inset-y-[0.5em] start-0 w-[2px] rounded-full bg-primary" />}
                        <span onClick={(e) => e.stopPropagation()} className="pt-[0.15em]">
                          <Checkbox checked={selected.has(i.key)} onChange={() => toggle(i.key)} label={<span className="sr-only">Sélectionner la demande de {fullName(i.employee)}</span>} />
                        </span>
                        <Avatar employee={i.employee} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-[0.5em]">
                            <p className="truncate text-sm font-semibold text-fg">{fullName(i.employee)}</p>
                            <span className="shrink-0 text-xs text-fg-muted">{ageLabel(i.createdAt)}</span>
                          </div>
                          <p className="flex items-center gap-[0.4em] truncate text-sm text-fg-secondary"><Icon className="size-[1em] shrink-0" aria-hidden strokeWidth={1.75} />{i.title}</p>
                          <p className="truncate text-xs text-fg-muted num">{i.subtitle}</p>
                          <p className={cn("mt-[0.35em] inline-flex items-center gap-[0.35em] text-xs font-medium", i.safe ? "text-success-fg" : "text-warning-fg")}>
                            {i.safe ? <ShieldCheck className="size-[1.1em]" aria-hidden /> : <AlertTriangle className="size-[1.1em]" aria-hidden />}
                            {i.safe ? "Sûre" : `${i.issues.filter((x) => x.tone !== "info").length} point${i.issues.filter((x) => x.tone !== "info").length > 1 ? "s" : ""} à examiner`}
                          </p>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}

            <AnimatePresence>
              {selectedItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={spring.snappy}
                  className="sticky bottom-[1em] z-10 flex flex-wrap items-center gap-[0.6em] rounded-lg border border-border bg-pine-900 px-[0.9em] py-[0.6em] text-[14px] text-white shadow-lg"
                >
                  <span className="me-auto font-medium">{selectedItems.length} sélectionnée{selectedItems.length > 1 ? "s" : ""}</span>
                  <Button size="sm" variant="inverse" icon={Check} onClick={() => approve(selectedItems)}>Approuver</Button>
                  <Button size="sm" variant="inverse" icon={X} onClick={() => setRejecting(selectedItems)}>Refuser</Button>
                  <Button size="icon" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" aria-label="Effacer la sélection" onClick={() => setSelected(new Set())}><X className="size-[1.1em]" /></Button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {desktop && (
            <aside aria-label="Contexte de la demande" className="min-w-0 lg:sticky lg:top-[1em]">
              {active ? (
                <Card className="flex max-h-[calc(100vh-7em)] flex-col gap-[1em] !p-0">
                  <div className="border-b border-border-subtle px-[1.5em] py-[1.1em]"><ItemHeader item={active} /></div>
                  <div className="flex-1 overflow-y-auto px-[1.5em]"><ItemBody item={active} /></div>
                  <div className="border-t border-border-subtle px-[1.5em] py-[1em]"><Actions safe={active.safe} onApprove={() => approve([active])} onReject={() => setRejecting([active])} /></div>
                </Card>
              ) : (
                <Card padded={false}><EmptyState title="Sélectionnez une demande" description="Le contexte (solde, équipe absente, historique) s'affiche ici." /></Card>
              )}
            </aside>
          )}
        </div>
      )}

      {items.length > 0 && desktop && (
        <p className="mt-[1.25em] flex flex-wrap items-center gap-x-[1.2em] gap-y-[0.4em] text-xs text-fg-muted" aria-label="Raccourcis clavier">
          <span><Kbd>J</Kbd> <Kbd>K</Kbd> naviguer</span>
          <span><Kbd>A</Kbd> approuver</span>
          <span><Kbd>R</Kbd> refuser</span>
          <span><Kbd>X</Kbd> sélectionner</span>
          <span><Kbd>Échap</Kbd> effacer la sélection</span>
        </p>
      )}

      <Drawer open={!desktop && drawer && !!active} onClose={() => setDrawer(false)} title={active ? fullName(active.employee) : ""} description={active?.title} width="28em" footer={active && <div className="w-full"><Actions safe={active.safe} onApprove={() => approve([active])} onReject={() => setRejecting([active])} /></div>}>
        {active && <ItemBody item={active} />}
      </Drawer>

      <ReasonModal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        description={rejecting?.length > 1 ? `${rejecting.length} demandes seront refusées avec ce motif.` : rejecting ? `${fullName(rejecting[0].employee)} · ${rejecting[0].title}` : undefined}
        onConfirm={confirmReject}
      />
    </>
  );
}
