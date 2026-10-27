// Single source for every motion number. Never inline durations, easings or springs.
export const ease = {
  out: [0.2, 0.8, 0.2, 1],
  inOut: [0.65, 0, 0.35, 1],
  emphasized: [0.16, 1, 0.3, 1],
};

export const duration = {
  fast: 0.12,
  base: 0.2,
  panel: 0.32,
  reveal: 0.6,
  stamp: 0.56,
};

export const spring = {
  soft: { type: "spring", stiffness: 180, damping: 24, mass: 0.9 },
  snappy: { type: "spring", stiffness: 380, damping: 32 },
  toggle: { type: "spring", stiffness: 500, damping: 34 },
  card: { type: "spring", stiffness: 140, damping: 16, mass: 1 },
};

export const follow = {
  cursor: { stiffness: 150, damping: 20, mass: 0.6 },
  slider: { stiffness: 260, damping: 28 },
  layers: { stiffness: 90, damping: 18 },
};

export const stagger = { tight: 0.04, base: 0.08, loose: 0.14 };

// Z separation (px) for the exploded payslip layers
export const depth = { plate: 0, rows: 28, chip: 56, seal: 84 };

export const variants = {
  rise: {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: duration.reveal, ease: ease.out } },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: duration.panel, ease: ease.out } },
  },
  container: {
    hidden: {},
    show: { transition: { staggerChildren: stagger.base } },
  },
  pop: {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1, transition: spring.soft },
  },
};

export const viewport = { once: true, margin: "-80px" };
