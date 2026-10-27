"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import BorderBeam from "@/components/motion/BorderBeam";
import MagneticButton from "@/components/motion/MagneticButton";

/** Primary CTA with a travelling light on its border and a hover magnet; secondary to the guided demo. */
export default function HeroCtas({ primary, secondary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[0.75em] gap-y-[0.5em]">
      <MagneticButton>
        <span className="relative inline-flex rounded-md">
          <Button href={primary.href} size="lg" iconEnd={ArrowRight}>
            {primary.label}
          </Button>
          <BorderBeam />
        </span>
      </MagneticButton>
      <Button href={secondary.href} size="lg" variant="secondary">
        {secondary.label}
      </Button>
    </div>
  );
}
