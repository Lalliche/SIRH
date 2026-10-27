"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { int } from "@/lib/format";
import { spring } from "@/lib/motion-tokens";
import Button from "./Button";
import { Checkbox } from "./Fields";
import EmptyState from "./EmptyState";

const rowH = { comfortable: "h-[2.9em]", standard: "h-[2.4em]", compact: "h-[2.1em]" };

/**
 * columns: [{ key, header, cell?(row), align?:"start"|"end", sortValue?(row), width?, className?, pinned? }]
 * bulkActions: [{ label, icon, onClick(rows), variant }]
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (r) => r.id,
  onRowClick,
  selectable = false,
  bulkActions = [],
  pageSize = 15,
  density = "standard",
  empty,
  footerRow,
  defaultSort,
  className,
}) {
  const [sort, setSort] = useState(defaultSort ?? null); // {key, dir}
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue ?? ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "fr");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const allOnPage = visible.length > 0 && visible.every((r) => selected.has(rowKey(r)));

  const cycle = (key) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  const toggleAll = (on) =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((r) => (on ? next.add(rowKey(r)) : next.delete(rowKey(r))));
      return next;
    });

  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));

  if (rows.length === 0 && empty) return <div className={cn("rounded-lg border border-border bg-surface", className)}>{empty}</div>;

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="h-[2.6em] bg-bg-sunken text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
              {selectable && (
                <th className="w-[3em] ps-[1.25em] text-start">
                  <Checkbox checked={allOnPage} onChange={toggleAll} label={<span className="sr-only">Tout sélectionner</span>} />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = c.sortable !== false && c.header;
                return (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("px-[1em] font-semibold first:ps-[1.25em] last:pe-[1.25em]", c.align === "end" ? "text-end" : "text-start", c.className)}
                  >
                    {sortable ? (
                      <button type="button" onClick={() => cycle(c.key)} className={cn("group inline-flex items-center gap-[0.35em] uppercase", c.align === "end" && "flex-row-reverse")}>
                        {c.header}
                        {active ? (sort.dir === "asc" ? <ArrowUp className="size-[1.1em]" /> : <ArrowDown className="size-[1.1em]" />) : <ChevronsUpDown className="size-[1.1em] opacity-0 transition-opacity group-hover:opacity-60" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const key = rowKey(row);
              const isSel = selected.has(key);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-t border-border-subtle transition-colors duration-100",
                    rowH[density],
                    onRowClick && "cursor-pointer",
                    isSel ? "bg-primary-soft" : "hover:bg-surface-hover",
                  )}
                >
                  {selectable && (
                    <td className="ps-[1.25em]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSel}
                        onChange={(on) => setSelected((p) => { const n = new Set(p); on ? n.add(key) : n.delete(key); return n; })}
                        label={<span className="sr-only">Sélectionner la ligne</span>}
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-[1em] py-[0.35em] first:ps-[1.25em] last:pe-[1.25em]", c.align === "end" ? "text-end num" : "text-start", c.className)}>
                      {c.cell ? c.cell(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
            {footerRow && (
              <tr className="border-t-[3px] border-double border-border-strong bg-pine-50 font-semibold dark:bg-primary-soft">
                {selectable && <td />}
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("px-[1em] py-[0.7em] first:ps-[1.25em] last:pe-[1.25em]", c.align === "end" ? "text-end num" : "text-start")}>
                    {footerRow[c.key] ?? (i === 0 ? "Total" : "")}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
        {rows.length === 0 && !empty && <EmptyState title="Aucun résultat" description="Modifiez vos filtres pour élargir la recherche." />}
      </div>

      {sorted.length > pageSize && (
        <div className="mt-[0.9em] flex items-center justify-between text-sm text-fg-muted">
          <span className="num">{int(safePage * pageSize + 1)} à {int(Math.min(sorted.length, (safePage + 1) * pageSize))} sur {int(sorted.length)}</span>
          <div className="flex items-center gap-[0.4em]">
            <Button variant="secondary" size="icon" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Page précédente"><ChevronLeft className="size-[1.2em]" /></Button>
            <span className="px-[0.6em] num">{safePage + 1} / {pages}</span>
            <Button variant="secondary" size="icon" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} aria-label="Page suivante"><ChevronRight className="size-[1.2em]" /></Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectable && selected.size > 0 && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={spring.snappy}
            className="fixed bottom-[1.5em] left-1/2 z-40 flex -translate-x-1/2 items-center gap-[0.8em] rounded-xl border border-border bg-pine-900 px-[1em] py-[0.6em] text-[14px] text-white shadow-lg"
          >
            <span className="px-[0.4em] font-medium">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
            {bulkActions.map((a) => (
              <Button key={a.label} size="sm" variant="inverse" icon={a.icon} onClick={() => { a.onClick(selectedRows); setSelected(new Set()); }}>
                {a.label}
              </Button>
            ))}
            <button type="button" onClick={() => setSelected(new Set())} aria-label="Tout désélectionner" className="rounded-sm p-[0.3em] text-white/70 hover:text-white">
              <X className="size-[1.1em]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
