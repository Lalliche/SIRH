"use client";

import { useState } from "react";
import { LayoutGroup, motion, useDragControls } from "motion/react";
import { ChevronLeft, ChevronRight, Clock, GripVertical } from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion-tokens";
import { STAGES, daysInStage, scorecardAverage, stageIndex } from "./helpers";

function stageAtPoint(point) {
  const els = document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY);
  return els.find((el) => el.dataset?.stage)?.dataset.stage ?? null;
}

function Card({ c, onOpen, onMove, setHover }) {
  const controls = useDragControls();
  const idx = stageIndex(c.stage);
  const days = daysInStage(c);
  const avg = scorecardAverage(c);
  const prev = STAGES[idx - 1];
  const next = STAGES[idx + 1];
  const stale = days > 14 && c.stage !== "hired" && c.stage !== "rejected";
  return (
    <motion.li
      layout
      layoutId={c.id}
      transition={spring.snappy}
      drag
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0.15}
      dragMomentum={false}
      whileDrag={{ scale: 1.03, zIndex: 40, boxShadow: "var(--shadow-lg)" }}
      onDrag={(_, info) => setHover(stageAtPoint(info.point))}
      onDragEnd={(_, info) => {
        const target = stageAtPoint(info.point);
        setHover(null);
        if (target && target !== c.stage) onMove(c, target);
      }}
      className="relative list-none rounded-md border border-border bg-surface p-[0.8em] shadow-xs"
    >
      <div className="flex items-start gap-[0.5em]">
        <button
          type="button"
          aria-label={`Glisser ${c.name} vers une autre étape`}
          onPointerDown={(e) => controls.start(e)}
          className="-ms-[0.3em] mt-[0.1em] cursor-grab touch-none rounded-xs p-[0.2em] text-fg-faint hover:text-fg-secondary active:cursor-grabbing"
        >
          <GripVertical className="size-[1.1em]" aria-hidden />
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
          <span className="flex items-center gap-[0.55em]">
            <Avatar name={c.name} size="sm" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{c.name}</span>
              <span className="block truncate text-xs text-fg-muted">{c.source}</span>
            </span>
          </span>
        </button>
      </div>
      <div className="mt-[0.6em] flex items-center justify-between gap-[0.5em] ps-[1.1em]">
        <span className="flex flex-wrap items-center gap-[0.4em]">
          <Badge tone={c.score >= 85 ? "success" : c.score >= 70 ? "info" : "neutral"} dot={false}>{c.score}/100</Badge>
          {avg != null && <span className="text-xs text-fg-muted num">★ {String(avg).replace(".", ",")}</span>}
        </span>
        <span className={cn("flex items-center gap-[0.3em] text-xs num", stale ? "font-medium text-warning-fg" : "text-fg-muted")} title="Jours dans cette étape">
          <Clock className="size-[1em]" aria-hidden />J+{days}
        </span>
      </div>
      <div className="mt-[0.5em] flex items-center justify-between ps-[1.1em]">
        <Button variant="ghost" size="sm" disabled={!prev} aria-label={prev ? `Déplacer ${c.name} vers ${prev.label}` : "Première étape"} onClick={() => onMove(c, prev.key)}><ChevronLeft className="size-[1.1em]" /></Button>
        <Button variant="ghost" size="sm" disabled={!next} aria-label={next ? `Déplacer ${c.name} vers ${next.label}` : "Dernière étape"} onClick={() => onMove(c, next.key)}><ChevronRight className="size-[1.1em]" /></Button>
      </div>
    </motion.li>
  );
}

export default function KanbanBoard({ candidates, onOpen, onMove }) {
  const [hover, setHover] = useState(null);
  return (
    <LayoutGroup>
      <div className="-mx-[0.25em] overflow-x-auto px-[0.25em] pb-[0.5em]">
        <div className="grid min-w-max grid-flow-col auto-cols-[15.5em] gap-[0.8em] xl:min-w-0 xl:auto-cols-fr">
          {STAGES.map((s) => {
            const list = candidates.filter((c) => c.stage === s.key);
            return (
              <section
                key={s.key}
                data-stage={s.key}
                aria-label={`${s.label}, ${list.length} candidat${list.length > 1 ? "s" : ""}`}
                className={cn("flex min-h-[18em] flex-col rounded-lg border bg-bg-sunken p-[0.6em] transition-[border-color,background-color] duration-150", hover === s.key ? "border-primary bg-primary-soft" : "border-transparent")}
              >
                <header className="mb-[0.6em] flex items-center justify-between px-[0.3em]">
                  <h3 className="text-sm font-semibold text-fg">{s.label}</h3>
                  <span className="rounded-full bg-surface px-[0.6em] text-xs text-fg-secondary num">{list.length}</span>
                </header>
                <ul className="flex flex-1 flex-col gap-[0.5em]">
                  {list.map((c) => <Card key={c.id} c={c} onOpen={() => onOpen(c.id)} onMove={onMove} setHover={setHover} />)}
                  {list.length === 0 && <li className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border-strong p-[1em] text-center text-xs text-fg-muted">Déposez un candidat ici</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}
