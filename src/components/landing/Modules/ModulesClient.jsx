"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SpotlightCard, SpotlightGroup } from "@/components/motion/SpotlightCard";
import Reveal from "@/components/motion/Reveal";
import { MINIS } from "./Minis";

const REPLAY_AFTER_MS = 3200;

function ModuleCard({ item, mini }) {
  const Mini = MINIS[item.id];
  const [run, setRun] = useState(0);
  const last = useRef(0);
  const wide = item.id === "paie";

  // Hover replays the miniature, at most once per play.
  const replay = (e) => {
    if (e.pointerType === "touch" || e.timeStamp - last.current < REPLAY_AFTER_MS) return;
    last.current = e.timeStamp;
    setRun((n) => n + 1);
  };

  return (
    <Reveal className={cn("flex", item.span)}>
      <SpotlightCard onPointerEnter={replay} className={cn("flex w-full flex-col gap-[1.4em] p-[1.5em]", wide && "lg:flex-row lg:items-center lg:gap-[2.5em]")}>
        <div className={cn("order-2 flex flex-col gap-[0.4em]", wide && "lg:order-1 lg:w-[42%] lg:shrink-0")}>
          <h3 className="text-h3 font-semibold text-fg">{item.title}</h3>
          <p className="text-fg-secondary">{item.description}</p>
        </div>
        <div className={cn("order-1 flex min-h-[13em] items-center rounded-lg border border-border-subtle bg-bg/60 p-[1.1em]", wide ? "lg:order-2 lg:flex-1" : "")}>
          <Mini key={run} t={mini[item.id]} />
        </div>
      </SpotlightCard>
    </Reveal>
  );
}

export default function ModulesClient({ items, mini }) {
  return (
    <SpotlightGroup className="grid gap-[1.1em] md:grid-cols-2 lg:grid-cols-6">
      {items.map((item) => (
        <ModuleCard key={item.id} item={item} mini={mini} />
      ))}
    </SpotlightGroup>
  );
}
