"use client";

import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Button } from "@/components/ui";
import { lpDur, lpEase, lpScroll } from "@/components/motion/landing-tokens";
import { floatingContact } from "@/content/floating-contact";

const digits = (s) => s.replace(/[^\d+]/g, "");

/** Mobile-only contact pill (WhatsApp + phone). Algerian SME buyers convert by phone: it rises after the first screen. */
export default function FloatingContactClient({ phone, whatsapp }) {
  const { scrollY } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setShown(y > lpScroll.contactAfter));

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          role="group"
          aria-label={floatingContact.label}
          initial={{ opacity: 0, y: "1.5em" }}
          animate={{ opacity: 1, y: "0em" }}
          exit={{ opacity: 0, y: "1em", transition: { duration: lpDur.fast, ease: lpEase.in } }}
          transition={{ duration: lpDur.slow, ease: lpEase.drawer }}
          className="fixed bottom-[max(1em,env(safe-area-inset-bottom))] end-[1em] z-40 flex items-center gap-[0.4em] rounded-pill border border-border bg-surface/90 p-[0.35em] shadow-lg backdrop-blur-[0.75em] md:hidden"
        >
          <Button href={`https://wa.me/${digits(whatsapp).replace("+", "")}`} variant="secondary" size="md" icon={MessageCircle} className="rounded-pill" target="_blank" rel="noopener noreferrer">
            {floatingContact.whatsapp}
          </Button>
          <Button href={`tel:${digits(phone)}`} variant="primary" size="md" icon={Phone} className="rounded-pill" aria-label={`${floatingContact.call} ${phone}`}>
            {floatingContact.call}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
