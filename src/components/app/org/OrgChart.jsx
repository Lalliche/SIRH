"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Maximize2, Minus, Network, Plus, ZoomIn } from "lucide-react";
import { Avatar, Badge, Button, Card, Drawer, EmptyState, PageHeader, SearchInput, SelectInput, StatusBadge } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { EMP_STATUS, canOpenProfile } from "@/components/app/employees/helpers";
import { useCollection } from "@/lib/db";
import { fullName, int } from "@/lib/format";
import { duration, ease, spring } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { NODE_H, NODE_W, layoutTree } from "./orgLayout";

const MIN = 0.25;
const MAX = 1.6;

export default function OrgChart() {
  return <AccessGate>{(user) => <Chart user={user} />}</AccessGate>;
}

function Chart({ user }) {
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const positions = useCollection("positions");
  const entities = useCollection("entities");

  const [expanded, setExpanded] = useState(() => new Set(employees.filter((e) => !e.managerId && e.status !== "sorti").map((e) => e.id)));
  const [dept, setDept] = useState("");
  const [query, setQuery] = useState("");
  const [peekId, setPeekId] = useState(null);
  const [focusId, setFocusId] = useState(null);

  const viewport = useRef(null);
  const canvas = useRef(null);
  const dragging = useRef(false);
  const fitted = useRef(false);
  const x = useMotionValue(16);
  const y = useMotionValue(16);
  const scale = useMotionValue(1);
  const zoomLabel = useTransform(scale, (s) => `${Math.round(s * 100)} %`);

  const active = useMemo(() => employees.filter((e) => e.status !== "sorti"), [employees]);
  const byId = useMemo(() => Object.fromEntries(active.map((e) => [e.id, e])), [active]);
  const pos = useMemo(() => Object.fromEntries(positions.map((p) => [p.id, p])), [positions]);
  const dep = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);
  const ent = useMemo(() => Object.fromEntries(entities.map((e) => [e.id, e])), [entities]);

  // Visible subset when filtering by department: members + all their ancestors
  const visible = useMemo(() => {
    if (!dept) return null;
    const set = new Set();
    active.filter((e) => e.departmentId === dept).forEach((e) => {
      for (let cur = e; cur && !set.has(cur.id); cur = byId[cur.managerId]) set.add(cur.id);
    });
    return set;
  }, [dept, active, byId]);

  const childrenMap = useMemo(() => {
    const map = {};
    active.forEach((e) => {
      if (e.managerId && byId[e.managerId] && (!visible || (visible.has(e.id) && visible.has(e.managerId)))) (map[e.managerId] ??= []).push(e);
    });
    Object.values(map).forEach((l) => l.sort((a, b) => a.lastName.localeCompare(b.lastName, "fr")));
    return map;
  }, [active, byId, visible]);
  const kids = useCallback((id) => childrenMap[id] ?? [], [childrenMap]);

  const roots = useMemo(() => active.filter((e) => (!e.managerId || !byId[e.managerId]) && (!visible || visible.has(e.id))), [active, byId, visible]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return active.filter((e) => `${e.firstName} ${e.lastName} ${pos[e.positionId]?.title ?? ""}`.toLowerCase().includes(q) && (!visible || visible.has(e.id)));
  }, [query, active, pos, visible]);

  // Effective expansion: user choices ∪ ancestors of matches ∪ everything when a department filter is on
  const open = useMemo(() => {
    const set = new Set(expanded);
    if (visible) visible.forEach((id) => set.add(id));
    matches.forEach((m) => {
      let cur = byId[m.managerId];
      while (cur) { set.add(cur.id); cur = byId[cur.managerId]; }
    });
    return set;
  }, [expanded, visible, matches, byId]);

  const layout = useMemo(() => layoutTree(roots, kids, (id) => open.has(id)), [roots, kids, open]);
  const posMap = useMemo(() => Object.fromEntries(layout.nodes.map((n) => [n.id, n])), [layout]);
  const matchIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);

  const emPx = () => parseFloat(getComputedStyle(canvas.current).fontSize) || 16;

  const fit = useCallback(() => {
    if (!viewport.current || !canvas.current) return;
    const vw = viewport.current.clientWidth;
    const vh = viewport.current.clientHeight;
    const px = emPx();
    const cw = layout.width * px;
    const ch = layout.height * px;
    const s = Math.min(1, Math.max(MIN, Math.min((vw - 32) / cw, (vh - 32) / ch)));
    animate(scale, s, spring.soft);
    animate(x, (vw - cw * s) / 2, spring.soft);
    animate(y, Math.max(16, (vh - ch * s) / 2), spring.soft);
  }, [layout, scale, x, y]);

  useEffect(() => {
    if (fitted.current || !roots.length) return;
    fitted.current = true;
    // jump (no animation) to the initial fit
    const vw = viewport.current.clientWidth;
    const vh = viewport.current.clientHeight;
    const px = emPx();
    const s = Math.min(1, Math.max(MIN, Math.min((vw - 32) / (layout.width * px), (vh - 32) / (layout.height * px))));
    scale.set(s);
    x.set((vw - layout.width * px * s) / 2);
    y.set(16);
  }, [roots, layout, scale, x, y]);

  const zoomTo = useCallback((next, cx, cy) => {
    const s = scale.get();
    const t = Math.min(MAX, Math.max(MIN, next));
    const vw = viewport.current.clientWidth;
    const vh = viewport.current.clientHeight;
    const px = cx ?? vw / 2;
    const py = cy ?? vh / 2;
    animate(x, px - (px - x.get()) * (t / s), spring.snappy);
    animate(y, py - (py - y.get()) * (t / s), spring.snappy);
    animate(scale, t, spring.snappy);
  }, [scale, x, y]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const s = scale.get();
      const t = Math.min(MAX, Math.max(MIN, s * Math.exp(-e.deltaY * 0.0025)));
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      x.set(px - (px - x.get()) * (t / s));
      y.set(py - (py - y.get()) * (t / s));
      scale.set(t);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, x, y]);

  const centerOn = useCallback((id, nodes = posMap) => {
    const n = nodes[id];
    if (!n || !viewport.current) return;
    const s = scale.get();
    const px = emPx();
    animate(x, viewport.current.clientWidth / 2 - (n.x + NODE_W / 2) * px * s, spring.soft);
    animate(y, viewport.current.clientHeight / 3 - (n.y + NODE_H / 2) * px * s, spring.soft);
  }, [posMap, scale, x, y]);

  const toggle = (id) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const expandAll = () => setExpanded(new Set(Object.keys(childrenMap)));
  const collapseAll = () => setExpanded(new Set());

  const onKeyDown = (e) => {
    const id = document.activeElement?.closest?.("[data-node]")?.dataset.node;
    if (e.key === "+" || e.key === "=") return zoomTo(scale.get() * 1.2);
    if (e.key === "-") return zoomTo(scale.get() / 1.2);
    if (e.key === "0") return fit();
    if (!id) return;
    const node = posMap[id];
    const siblings = layout.nodes.filter((n) => n.parentId === node.parentId && n.y === node.y).sort((a, b) => a.x - b.x);
    let target = null;
    if (e.key === "ArrowUp") target = node.parentId;
    if (e.key === "ArrowDown") {
      if (kids(id).length && !open.has(id)) { toggle(id); e.preventDefault(); return; }
      target = layout.nodes.find((n) => n.parentId === id)?.id ?? null;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const i = siblings.findIndex((s) => s.id === id);
      target = siblings[i + (e.key === "ArrowRight" ? 1 : -1)]?.id ?? null;
      if (!target && node.parentId === null) target = null;
    }
    if (e.key === "ArrowUp" && open.has(id) && !node.parentId && kids(id).length) { toggle(id); e.preventDefault(); return; }
    if (target) {
      e.preventDefault();
      document.querySelector(`[data-node="${target}"] [data-card]`)?.focus({ preventScroll: true });
      setFocusId(target);
      centerOn(target);
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (matches[0]) {
      centerOn(matches[0].id);
      setFocusId(matches[0].id);
    }
  };

  if (!active.length) {
    return <EmptyState icon={Network} title="Aucun employé à afficher" description="Ajoutez des employés et renseignez leur responsable pour construire l'organigramme." action={<Button href="/app/employees/new">Ajouter un employé</Button>} />;
  }

  const peek = peekId ? byId[peekId] : null;
  const peekManager = peek ? byId[peek.managerId] : null;
  const peekReports = peek ? active.filter((e) => e.managerId === peek.id) : [];
  const openable = peek && canOpenProfile(user.role, user.employee, peek, employees, departments);
  const withReports = Object.keys(childrenMap).length;

  return (
    <div>
      <PageHeader
        title="Organigramme"
        description={`${int(active.length)} personnes · ${int(withReports)} responsables. Glissez pour déplacer, Ctrl + molette ou boutons pour zoomer.`}
        actions={<Button variant="secondary" href="/app/employees">Liste des employés</Button>}
      />

      <div className="mb-[0.9em] flex flex-wrap items-center gap-[0.6em]">
        <form onSubmit={submitSearch} className="w-full sm:w-[20em]" role="search">
          <SearchInput value={query} onChange={setQuery} placeholder="Trouver une personne ou un poste…" />
        </form>
        <SelectInput
          aria-label="Filtrer par département"
          value={dept}
          onChange={setDept}
          placeholder="Tous les départements"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          className="w-full sm:w-[16em] [&_select]:h-[2.5em] [&_select]:text-[0.875em]"
        />
        {query && <span className="text-sm text-fg-muted" aria-live="polite">{matches.length ? `${matches.length} résultat${matches.length > 1 ? "s" : ""} · Entrée pour centrer` : "Aucun résultat"}</span>}
        <div className="ms-auto flex flex-wrap items-center gap-[0.4em]">
          <Button variant="ghost" size="sm" icon={ChevronsUpDown} onClick={expandAll}>Tout développer</Button>
          <Button variant="ghost" size="sm" icon={ChevronsDownUp} onClick={collapseAll}>Tout réduire</Button>
        </div>
      </div>

      <Card padded={false} className="relative overflow-hidden">
        <div
          ref={viewport}
          onKeyDown={onKeyDown}
          role="group"
          aria-label="Zone de l'organigramme. Flèches : naviguer, plus et moins : zoomer, zéro : ajuster."
          className="relative h-[min(70vh,44em)] min-h-[26em] cursor-grab touch-none overflow-hidden bg-surface-2 bg-[radial-gradient(var(--border)_0.06em,transparent_0.06em)] bg-[length:1.4em_1.4em] active:cursor-grabbing"
        >
          <motion.div
            ref={canvas}
            drag
            dragMomentum={false}
            onDragStart={() => { dragging.current = true; }}
            onDragEnd={() => setTimeout(() => { dragging.current = false; }, 0)}
            style={{ x, y, scale, transformOrigin: "0 0", width: `${layout.width}em`, height: `${layout.height}em` }}
            className="absolute start-0 top-0"
          >
            <svg className="pointer-events-none absolute inset-0 overflow-visible" width="100%" height="100%" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden>
              {layout.edges.map((edge) => (
                <motion.path
                  key={edge.id}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, d: edge.d }}
                  animate={{ pathLength: 1, d: edge.d }}
                  transition={{ duration: duration.panel, ease: ease.out }}
                />
              ))}
            </svg>

            {layout.nodes.map((n) => {
              const e = byId[n.id];
              const count = kids(n.id).length;
              const total = active.filter((a) => a.managerId === n.id).length;
              const isOpen = open.has(n.id);
              const dim = (visible && e.departmentId !== dept) || (query && matches.length && !matchIds.has(n.id));
              return (
                <div
                  key={n.id}
                  data-node={n.id}
                  style={{ width: `${NODE_W}em`, height: `${NODE_H}em`, transform: `translate(${n.x}em, ${n.y}em)` }}
                  className="absolute start-0 top-0 transition-transform duration-300 ease-out-soft motion-reduce:transition-none"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: dim ? 0.5 : 1, scale: 1 }}
                    transition={{ duration: duration.panel, ease: ease.out }}
                    className="size-full"
                  >
                    <Card
                      as="button"
                      type="button"
                      data-card
                      interactive
                      padded={false}
                      aria-label={`${fullName(e)}, ${pos[e.positionId]?.title ?? ""}${total ? `, ${total} collaborateur${total > 1 ? "s" : ""} direct${total > 1 ? "s" : ""}` : ""}`}
                      onClick={() => { if (!dragging.current) { setPeekId(e.id); setFocusId(e.id); } }}
                      className={cn(
                        "flex size-full items-center gap-[0.7em] px-[0.8em] text-start",
                        (matchIds.has(e.id) || focusId === e.id && peekId === e.id) && "border-primary shadow-md",
                        matchIds.has(e.id) && "ring-2 ring-ring",
                      )}
                    >
                      <Avatar employee={e} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-fg">{fullName(e)}</span>
                        <span className="block truncate text-xs text-fg-secondary">{pos[e.positionId]?.title}</span>
                        <span className="block truncate text-[0.7em] text-fg-muted">{dep[e.departmentId]?.name}</span>
                      </span>
                    </Card>
                    {count > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Réduire" : "Développer"} l'équipe de ${e.firstName} (${count})`}
                        onClick={() => toggle(n.id)}
                        iconEnd={ChevronDown}
                        className={cn("absolute -bottom-[1em] start-1/2 z-[2] !h-[1.8em] -translate-x-1/2 !px-[0.55em] !text-[0.7em]", isOpen && "[&_svg]:rotate-180")}
                      >
                        {count}
                      </Button>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </motion.div>

          <div className="absolute bottom-[0.9em] end-[0.9em] z-10 flex items-center gap-[0.3em] rounded-lg border border-border bg-surface p-[0.25em] shadow-md">
            <Button variant="ghost" size="icon" icon={Minus} aria-label="Dézoomer" onClick={() => zoomTo(scale.get() / 1.25)} />
            <motion.span className="w-[3.4em] text-center text-xs text-fg-secondary num" aria-live="off">{zoomLabel}</motion.span>
            <Button variant="ghost" size="icon" icon={Plus} aria-label="Zoomer" onClick={() => zoomTo(scale.get() * 1.25)} />
            <Button variant="ghost" size="icon" icon={Maximize2} aria-label="Ajuster à la fenêtre" onClick={fit} />
          </div>
          <p className="pointer-events-none absolute start-[0.9em] top-[0.8em] flex items-center gap-[0.4em] text-xs text-fg-muted"><ZoomIn className="size-[1.1em]" aria-hidden />Ctrl + molette pour zoomer</p>
        </div>
      </Card>

      <Drawer
        open={!!peek}
        onClose={() => setPeekId(null)}
        width="26em"
        title={peek ? fullName(peek) : ""}
        description={peek ? pos[peek.positionId]?.title : undefined}
        footer={
          peek && (
            <>
              <Button variant="ghost" onClick={() => { centerOn(peek.id); setPeekId(null); }}>Centrer dans l’organigramme</Button>
              {openable && <Button href={`/app/employees/${peek.id}`}>Ouvrir la fiche</Button>}
            </>
          )
        }
      >
        {peek && (
          <div className="flex flex-col gap-[1.25em]">
            <div className="flex items-center gap-[1em]">
              <Avatar employee={peek} size="lg" />
              <div className="flex flex-col items-start gap-[0.4em]">
                <StatusBadge status={peek.status} map={EMP_STATUS} />
                <Badge tone="neutral" dot={false}>{dep[peek.departmentId]?.name}</Badge>
              </div>
            </div>
            <dl className="text-sm">
              {[["Entité", ent[peek.entityId]?.name], ["Matricule", peek.matricule], ["Email", peek.email], ["Téléphone", peek.phone]].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-[1em] border-b border-border-subtle py-[0.6em]"><dt className="text-fg-muted">{l}</dt><dd className="min-w-0 truncate text-end text-fg">{v}</dd></div>
              ))}
            </dl>
            {peekManager && (
              <section>
                <h3 className="mb-[0.4em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Responsable</h3>
                <PersonButton e={peekManager} pos={pos} onClick={() => setPeekId(peekManager.id)} />
              </section>
            )}
            <section>
              <h3 className="mb-[0.4em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Équipe directe ({peekReports.length})</h3>
              {peekReports.length ? (
                <ul className="flex flex-col">{peekReports.map((r) => <li key={r.id}><PersonButton e={r} pos={pos} onClick={() => setPeekId(r.id)} /></li>)}</ul>
              ) : (
                <p className="text-sm text-fg-muted">Aucun collaborateur direct.</p>
              )}
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function PersonButton({ e, pos, onClick }) {
  return (
    <Button variant="ghost" onClick={onClick} className="!h-auto w-full justify-start !px-[0.5em] !py-[0.45em]">
      <Avatar employee={e} size="sm" />
      <span className="min-w-0 text-start">
        <span className="block truncate text-sm font-medium text-fg">{fullName(e)}</span>
        <span className="block truncate text-xs font-normal text-fg-muted">{pos[e.positionId]?.title}</span>
      </span>
    </Button>
  );
}
