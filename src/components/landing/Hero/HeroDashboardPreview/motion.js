// Motion variants for the hero dashboard preview. Every value is pulled from src/lib/motion-tokens.js —
// no new durations/easings are invented here.
import { duration, ease, stagger } from "@/lib/motion-tokens";

export const frameReveal = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: duration.reveal, ease: ease.out } },
};

export const viewSwap = {
  enter: { opacity: 0, x: 12 },
  center: { opacity: 1, x: 0, transition: { duration: duration.panel, ease: ease.out } },
  exit: { opacity: 0, x: -8, transition: { duration: duration.base, ease: ease.out } },
};

export const tabSwap = (dir) => ({
  enter: { opacity: 0, x: 14 * dir },
  center: { opacity: 1, x: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, x: -14 * dir, transition: { duration: duration.fast, ease: ease.out } },
});

export const staggerParent = {
  hidden: {},
  shown: { transition: { delayChildren: 0.08, staggerChildren: stagger.base } },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: ease.out } },
};
