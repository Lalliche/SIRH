import { cn } from "@/lib/utils";
import Reveal from "@/components/motion/Reveal";

/**
 * eyebrow + display heading + subcopy. `tone="dark"` for pine bands.
 * `align`: "start" (default) centers on mobile and settles to the start edge from `md` up —
 * a left-aligned block reads as a layout mistake on a narrow screen. "center" stays centered at every width.
 */
export default function SectionHeader({ eyebrow, title, description, id, align = "start", tone = "light", className }) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "mx-auto flex max-w-[44em] flex-col items-center gap-[1em] text-center",
        align === "start" && "md:mx-0 md:items-start md:text-start",
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <p className={cn("text-xs font-semibold uppercase tracking-[0.1em]", dark ? "text-pine-300" : "text-link")}>{eyebrow}</p>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2 id={id} className={cn("text-[2.25em] font-semibold leading-[1.06] tracking-[-0.03em] md:text-[2.75em] lg:text-[3.25em] xl:text-display", dark ? "text-pine-50" : "text-fg")}>
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.1}>
          <p className={cn("max-w-[52ch] text-lead", dark ? "text-pine-200" : "text-fg-secondary")}>{description}</p>
        </Reveal>
      )}
    </div>
  );
}
