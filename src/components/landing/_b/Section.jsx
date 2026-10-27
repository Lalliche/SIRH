import { cn } from "@/lib/utils";

const tones = {
  bg: "bg-bg",
  sunken: "bg-bg-sunken",
  dark: "bg-pine-900 text-pine-50",
};

/** Landing section shell: id for anchors, aria-labelledby for the heading, rhythm padding. */
export default function Section({ id, labelledBy, tone = "bg", className, children }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("relative scroll-mt-[4.5em] overflow-clip py-[6em] md:py-[8em]", tones[tone], className)}>
      {children}
    </section>
  );
}
