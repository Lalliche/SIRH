"use client";

import { useRef } from "react";
import { ArrowUp } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import Container from "@/components/shared/Container";
import { Button } from "@/components/ui";
import { useCanHover } from "@/components/motion/use-media";
import { lpFollow } from "@/components/motion/landing-tokens";

/** Giant cropped wordmark that rises as the footer is reached; a soft cursor light passes over it on desktop. */
export default function FooterWordmark({ label, toTop }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["38%", "0%"]);

  const mx = useSpring(useMotionValue(-1000), lpFollow.spotlight);
  const light = useMotionTemplate`radial-gradient(14em circle at ${mx}px 60%, var(--pine-500), transparent 70%)`;

  const onMove = canHover && !reduce ? (e) => mx.set(e.clientX - e.currentTarget.getBoundingClientRect().left) : undefined;

  return (
    <div ref={ref} className="relative mt-[1em]">
      <Container className="flex justify-end">
        <Button variant="secondary" size="sm" icon={ArrowUp} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {toTop}
        </Button>
      </Container>
      <div className="relative mt-[-0.5em] h-[min(17vw,17em)] overflow-hidden select-none" aria-hidden onPointerMove={onMove}>
        <motion.p
          style={{ y }}
          className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-[18%] text-center font-display text-[length:min(24vw,24em)] font-bold leading-none tracking-[-0.05em] text-fg/[0.07]"
        >
          {label}
        </motion.p>
        {canHover && !reduce && (
          <motion.p
            style={{ y, backgroundImage: light }}
            className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-[18%] bg-clip-text text-center font-display text-[length:min(24vw,24em)] font-bold leading-none tracking-[-0.05em] text-transparent opacity-30"
          >
            {label}
          </motion.p>
        )}
      </div>
    </div>
  );
}
