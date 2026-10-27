"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui";
import { lpDur, lpEase } from "@/components/motion/landing-tokens";
import { stagger } from "@/lib/motion-tokens";

const sheet = {
  hidden: { x: "100%" },
  visible: { x: "0%", transition: { duration: lpDur.sheet, ease: lpEase.drawer, delayChildren: 0.12, staggerChildren: stagger.tight } },
  exit: { x: "100%", transition: { duration: lpDur.base, ease: lpEase.in } },
};
const item = {
  hidden: { opacity: 0, y: "0.6em" },
  visible: { opacity: 1, y: "0em", transition: { duration: lpDur.slow, ease: lpEase.outStrong } },
};

/** Full-height drawer from the end edge. Locks body scroll, closes on Esc, focuses the first link. */
export default function MobileMenu({ nav, phone, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("a")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current(true);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const flat = nav.links.flatMap((l) => (l.menu ? l.menu.slice(0, 1).map((m) => ({ ...m, label: l.label })) : [l]));

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 top-[4em] -z-10 bg-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: lpDur.base }}
        onClick={() => onClose(false)}
      />
      <motion.nav
        ref={ref}
        id="mobile-menu"
        aria-label={nav.label}
        variants={sheet}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-y-0 end-0 top-[4em] flex w-[min(24em,100vw)] flex-col gap-[1.5em] overflow-y-auto border-s border-border bg-bg px-[1.5em] pb-[2em] pt-[1.5em] shadow-lg"
      >
        <ul className="flex flex-col">
          {flat.map((link) => (
            <motion.li key={link.href} variants={item} className="border-b border-border-subtle">
              <Link
                href={link.href}
                onClick={() => onClose(false)}
                className="flex items-center justify-between py-[0.75em] font-display text-[1.6em] font-semibold tracking-[-0.02em] text-fg"
              >
                {link.label}
                <ArrowRight className="size-[0.7em] text-fg-faint" aria-hidden strokeWidth={1.5} />
              </Link>
            </motion.li>
          ))}
        </ul>

        <motion.div variants={item} className="flex flex-col gap-[0.6em]">
          <Button href={nav.cta.href} size="lg" onClick={() => onClose(false)}>
            {nav.cta.label}
          </Button>
          <Button href={nav.login.href} variant="secondary" size="lg" onClick={() => onClose(false)}>
            {nav.login.label}
          </Button>
        </motion.div>

        <motion.div variants={item} className="mt-auto space-y-[0.6em] text-sm text-fg-muted">
          <p>{nav.mobileHint}</p>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-[0.5em] font-medium text-fg">
            <Phone className="size-[1.1em]" aria-hidden strokeWidth={1.75} />
            <span className="num">{phone}</span>
          </a>
        </motion.div>
      </motion.nav>
    </>
  );
}
