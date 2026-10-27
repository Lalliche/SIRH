"use client";

/**
 * Hero dashboard preview — the landing page's proof that SIRH is a real working tool, not a mockup.
 * A broad, role-aware (Admin ⇄ Employé), tab-swapping (Paie / Congés / Pointage) dashboard frame that reveals
 * on scroll. See specs/research/hero-dashboard-pattern.md for the rationale.
 *
 * Everything inside is local mock data: no API, no auth, no navigation (every <a> is neutralised so the
 * demo never accidentally routes to /app/*).
 */
import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import PreviewHeader from "./PreviewHeader";
import PreviewNav from "./PreviewNav";
import PreviewTabs from "./PreviewTabs";
import PaiePanel from "./panels/PaiePanel";
import CongesPanel from "./panels/CongesPanel";
import PointagePanel from "./panels/PointagePanel";
import { VIEWS } from "./mock-data";
import { frameReveal, viewSwap, tabSwap, staggerParent } from "./motion";

const TAB_ORDER = ["paie", "conges", "pointage"];
const PANELS = { paie: PaiePanel, conges: CongesPanel, pointage: PointagePanel };

function sealNavigation(e) {
  const anchor = e.target.closest?.("a[href]");
  if (anchor) {
    e.preventDefault();
    e.stopPropagation();
  }
}

export default function HeroDashboardPreview() {
  const reduce = useReducedMotion();
  const frameRef = useRef(null);
  const inView = useInView(frameRef, { once: true, amount: 0.2, margin: "0px 0px -10% 0px" });
  const played = inView || reduce;

  const [view, setView] = useState("admin");
  const [tab, setTab] = useState("paie");
  const [dir, setDir] = useState(1);

  function handleTab(next) {
    if (next === tab) return;
    setDir(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
  }

  const cfg = VIEWS[view];
  const Panel = PANELS[tab];

  return (
    <div className="relative mt-[4em] hidden sm:block md:mt-[5em]">
      <span
        aria-hidden
        className="absolute -inset-x-[4em] -inset-y-[2em] -z-10 bg-[radial-gradient(60%_80%_at_50%_30%,color-mix(in_srgb,var(--pine-200)_40%,transparent),transparent_70%)]"
      />
      <motion.div
        ref={frameRef}
        onClickCapture={sealNavigation}
        variants={reduce ? undefined : frameReveal}
        initial={reduce ? false : "hidden"}
        animate={played ? "shown" : "hidden"}
        style={{ transformOrigin: "50% 100%" }}
        aria-label="Aperçu interactif de SIRH : tableau de bord de la paie, des congés et du pointage."
        className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-bg-sunken shadow-[0_1px_2px_rgba(16,33,31,0.04),0_8px_24px_rgba(16,33,31,0.06),0_30px_80px_rgba(7,43,42,0.14)]"
      >
        <PreviewHeader view={view} onViewChange={setView} identity={cfg.identity} />

        <div className="flex">
          <PreviewNav tab={tab} onSelect={handleTab} />

          <div className="flex min-w-0 flex-1 flex-col p-[0.7em] ps-0">
            <div className="flex min-h-[21em] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
              <PreviewTabs tab={tab} onSelect={handleTab} subtitle={cfg.subtitle} />

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  variants={reduce ? undefined : viewSwap}
                  initial={reduce ? false : "enter"}
                  animate="center"
                  exit={reduce ? undefined : "exit"}
                  className="flex-1"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={tab}
                      variants={reduce ? undefined : tabSwap(dir)}
                      initial={reduce ? false : "enter"}
                      animate="center"
                      exit={reduce ? undefined : "exit"}
                    >
                      <motion.div variants={reduce ? undefined : staggerParent} initial={reduce ? false : "hidden"} animate="shown">
                        <Panel kpis={cfg.kpis[tab] ?? cfg.kpis.paie} played={played} reduce={reduce} />
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
